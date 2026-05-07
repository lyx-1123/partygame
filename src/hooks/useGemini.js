import { useState, useRef, useCallback } from 'react'

async function fetchWords(category, exclude = []) {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) throw new Error('未設定 API 金鑰')

  const avoidLine = exclude.length > 0
    ? `以下詞彙已出現過，請完全避免重複，並產生全新的不同詞彙：${exclude.join('、')}。`
    : ''

  const prompt =
    `你是一個遊戲題庫專家。請針對類別 [${category}] 產生 20 個適合派對遊戲的繁體中文名詞。` +
    `難度需適中，避免過於冷門。${avoidLine}` +
    `請嚴格以 JSON 格式回傳，格式範例：{"words": ["詞彙1", "詞彙2", ...]}。不要包含任何解釋文字或 Markdown 語法。`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`HTTP ${res.status}: ${errBody?.error?.message ?? ''}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.words) || parsed.words.length === 0) throw new Error('回應格式錯誤')
  console.log(`[Gemini] ✅ ${parsed.words.length} words for "${category}":`, parsed.words)
  return parsed.words
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

  // Returns true on success, false on failure (caller decides whether to enter game)
  const loadWords = useCallback(async (category, usedWords) => {
    setLoading(true)
    setLoadError(null)
    wordListRef.current = []
    setWordList([])
    seenRef.current = new Set(usedWords)

    try {
      addFresh(await fetchWords(category, [...usedWords].slice(-100)))
      return true
    } catch (err) {
      console.error('[Gemini] loadWords failed:', err.message)
      setLoadError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAndRefill = useCallback((currentIndex, category) => {
    const remaining = wordListRef.current.length - currentIndex
    if (fetchingRef.current || remaining > 10) return

    fetchingRef.current = true
    console.log(`[Gemini] checkAndRefill (remaining=${remaining})`)

    fetchWords(category, [...seenRef.current].slice(-100))
      .then(words => addFresh(words))
      .catch(err => console.warn('[Gemini] refill failed:', err.message))
      .finally(() => { fetchingRef.current = false })
  }, [])

  return { wordList, loading, loadError, loadWords, checkAndRefill }
}
