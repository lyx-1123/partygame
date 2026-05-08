import { useState, useRef, useCallback } from 'react'

function parseRetryMs(message) {
  const m = message.match(/retry in ([\d.]+)s/i)
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 12000
}

async function fetchWords(category, exclude = []) {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) throw new Error('未設定 API 金鑰')

  const avoidLine = exclude.length > 0
    ? `以下詞彙已出現過，請完全避免重複，並產生全新的不同詞彙：${exclude.join('、')}。`
    : ''

  const prompt =
    `你是一個遊戲題庫專家。請針對類別 [${category}] 產生 50 個適合派對遊戲的繁體中文名詞。` +
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

  const loadWords = useCallback(async (category, usedWords) => {
    setLoading(true)
    setLoadError(null)
    wordListRef.current = []
    setWordList([])
    seenRef.current = new Set(usedWords)

    const exclude = [...usedWords].slice(-100)
    let lastErr = null

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        addFresh(await fetchWords(category, exclude))
        setLoading(false)
        return true
      } catch (err) {
        lastErr = err
        if (err.message.includes('429') && attempt < 5) {
          const waitMs = parseRetryMs(err.message)
          console.log(`[Gemini] 429 rate limit, waiting ${waitMs}ms (attempt ${attempt}/5)`)
          await new Promise(r => setTimeout(r, waitMs))
        } else {
          break
        }
      }
    }

    console.error('[Gemini] loadWords failed:', lastErr.message)
    setLoadError(lastErr.message)
    setLoading(false)
    return false
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
