import { useState, useRef, useCallback } from 'react'

// Models in priority order — switch to next on 429 or 404
const MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    // Thinking enabled: model reviews word quality internally before outputting
    generationConfig: { thinkingConfig: { thinkingLevel: 'medium' } },
  },
  { id: 'gemini-3-flash-preview' },
  { id: 'gemini-2.5-flash' },
  { id: 'gemini-2.5-flash-lite' },
]

async function fetchWords(category, exclude = [], modelIndex = 0) {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) throw new Error('未設定 API 金鑰')

  const model = MODELS[Math.min(modelIndex, MODELS.length - 1)]

  const avoidLine = exclude.length > 0
    ? `以下詞彙已出現過，請完全避免重複，並產生全新的不同詞彙：${exclude.join('、')}。`
    : ''

  const prompt =
    `你是一個遊戲題庫專家。請針對類別 [${category}] 產生 50 個適合派對遊戲的繁體中文名詞。` +
    `難度需適中，避免過於冷門。${avoidLine}` +
    `請嚴格以 JSON 格式回傳，格式範例：{"words": ["詞彙1", "詞彙2", ...]}。不要包含任何解釋文字或 Markdown 語法。`

  const body = { contents: [{ parts: [{ text: prompt }] }] }
  if (model.generationConfig) body.generationConfig = model.generationConfig

  console.log(`[Gemini] Fetching with model: ${model.id}`)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`HTTP ${res.status}: ${errBody?.error?.message ?? ''}`)
  }

  const data = await res.json()
  // When thinking is active the parts array may contain thought entries — take only output parts
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const outputPart = parts.find(p => !p.thought) ?? parts[0]
  const raw = outputPart?.text?.trim() ?? ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.words) || parsed.words.length === 0) throw new Error('回應格式錯誤')
  console.log(`[Gemini] ✅ ${parsed.words.length} words from ${model.id}:`, parsed.words)
  return parsed.words
}

// Always try from model 0; advance on 429 or 404; throw if all exhausted
async function fetchWithCascade(category, exclude) {
  for (let mi = 0; mi < MODELS.length; mi++) {
    try {
      return await fetchWords(category, exclude, mi)
    } catch (err) {
      const shouldAdvance = err.message.includes('429') || err.message.includes('404') || err.message.includes('503')
      if (shouldAdvance && mi + 1 < MODELS.length) {
        console.log(`[Gemini] ${MODELS[mi].id} unavailable, trying next model`)
        continue
      }
      if (shouldAdvance && mi + 1 === MODELS.length) {
        throw new Error('所有模型額度已用完，請稍後再試')
      }
      throw err
    }
  }
}

export function useGemini() {
  const [wordList, setWordList] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const wordListRef = useRef([])
  const seenRef = useRef(new Set())
  const fetchingRef = useRef(false)

  function addFresh(words) {
    const fresh = words.filter(w => !seenRef.current.has(w))
    fresh.forEach(w => seenRef.current.add(w))
    const updated = [...wordListRef.current, ...fresh]
    wordListRef.current = updated
    setWordList(updated)
    console.log(`[Gemini] addFresh +${fresh.length} → buffer ${updated.length}`)
    return fresh.length
  }

  const loadWords = useCallback(async (category, usedWords) => {
    setLoading(true)
    setLoadError(null)
    wordListRef.current = []
    setWordList([])
    seenRef.current = new Set(usedWords)

    try {
      addFresh(await fetchWithCascade(category, [...usedWords].slice(-100)))
      setLoading(false)
      return true
    } catch (err) {
      console.error('[Gemini] loadWords failed:', err.message)
      setLoadError(err.message)
      setLoading(false)
      return false
    }
  }, [])

  const checkAndRefill = useCallback((currentIndex, category) => {
    const remaining = wordListRef.current.length - currentIndex
    if (fetchingRef.current || remaining > 10) return

    fetchingRef.current = true
    console.log(`[Gemini] checkAndRefill (remaining=${remaining})`)

    fetchWithCascade(category, [...seenRef.current].slice(-100))
      .then(words => addFresh(words))
      .catch(err => console.warn('[Gemini] refill failed:', err.message))
      .finally(() => { fetchingRef.current = false })
  }, [])

  return { wordList, loading, loadError, loadWords, checkAndRefill }
}
