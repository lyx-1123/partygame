import { useState, useRef, useCallback } from 'react'

const MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    generationConfig: { thinkingConfig: { thinkingLevel: 'medium' } },
  },
  { id: 'gemini-3-flash-preview' },
  { id: 'gemini-2.5-flash' },
  { id: 'gemini-2.5-flash-lite' },
]

const CATEGORY_RULES = {
  隨機: `
- 題目盡量生活化，任何種類的名詞都可以（食物、地名、動物、人物、電影、職業、運動等皆可）
- 涵蓋全世界，不分種類
- 相同種類題目不可連續排列，需混合穿插各種類別
- 題目字數不限，但需合理`,

  食物: `
- 題目盡量生活化，以菜單上常見的菜名為主
- 不同口味、風味的食物都可以，但相似系列不可連續排列
- 涵蓋全世界的食物
- 不要出菜單上看不到的東西
- 題目字數不限，但需合理`,

  動物: `
- 題目盡量生活化
- 相同生活習慣、生活環境、種類的動物不可連續排列
- 涵蓋全世界的動物
- 題目字數不限，但需合理`,

  地名: `
- 題目盡量生活化
- 同一個國家的地名不可連續出現
- 每 10 題內不可都是同一個洲的地名，需分散各洲
- 涵蓋全世界的國家名、城市名、地名
- 題目字數不限，但需合理`,

  卡通: `
- 題目盡量生活化
- 每 10 題內不可都是同一個國家的卡通
- 涵蓋全世界的卡通、動畫、動漫、漫畫
- 題目字數不限，但需合理`,

  名人: `
- 題目盡量生活化
- 每 10 題內不可都是同一個國家或同一個時代的名人
- 涵蓋全世界的名人
- 題目字數不限，但需合理`,

  電影: `
- 題目盡量生活化
- 每 10 題內不可都是同一個國家或同一個類型的電影
- 涵蓋全世界的電影
- 題目字數不限，但需合理`,

  職業: `
- 題目盡量生活化
- 涵蓋各種不同領域的職業
- 題目字數不限，但需合理`,

  運動: `
- 題目盡量生活化
- 涵蓋全世界各種運動
- 題目字數不限，但需合理`,
}

function buildPrompt(category, exclude) {
  const rules = CATEGORY_RULES[category] ?? `\n- 難度適中，避免過於冷門\n- 題目字數不限，但需合理`
  const avoidLine = exclude.length > 0
    ? `\n已出現過的詞彙（請完全避免重複）：${exclude.join('、')}。`
    : ''
  const categoryLabel = category === '隨機' ? '（不限類別，全方位隨機）' : `[${category}]`

  return (
    `你是一個派對猜謎遊戲的出題專家。請產生 50 個適合派對猜謎遊戲的繁體中文名詞，類別為 ${categoryLabel}。\n` +
    `出題規則：${rules}\n` +
    avoidLine +
    `\n請嚴格以 JSON 格式回傳，格式範例：{"words": ["詞彙1", "詞彙2", ...]}。不要包含任何解釋文字或 Markdown 語法。`
  )
}

async function fetchWords(category, exclude = [], modelIndex = 0) {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) throw new Error('未設定 API 金鑰')

  const model = MODELS[Math.min(modelIndex, MODELS.length - 1)]
  const prompt = buildPrompt(category, exclude)
  const body = { contents: [{ parts: [{ text: prompt }] }] }
  if (model.generationConfig) body.generationConfig = model.generationConfig

  console.log(`[Gemini] Fetching "${category}" with model: ${model.id}`)

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
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const outputPart = parts.find(p => !p.thought) ?? parts[0]
  const raw = outputPart?.text?.trim() ?? ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.words) || parsed.words.length === 0) throw new Error('回應格式錯誤')
  console.log(`[Gemini] ✅ ${parsed.words.length} words from ${model.id}:`, parsed.words)
  return parsed.words
}

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
      addFresh(await fetchWithCascade(category, [...usedWords]))
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

    fetchWithCascade(category, [...seenRef.current])
      .then(words => addFresh(words))
      .catch(err => console.warn('[Gemini] refill failed:', err.message))
      .finally(() => { fetchingRef.current = false })
  }, [])

  return { wordList, loading, loadError, loadWords, checkAndRefill }
}
