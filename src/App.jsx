import { useState, useCallback } from 'react'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import SummaryScreen from './components/SummaryScreen'
import { useGemini } from './hooks/useGemini'

const CATEGORIES = ['隨機', '動物', '食物', '職業', '電影', '運動', '名人', '地名', '卡通']
const LS_KEY = 'partygame_used_words'

function loadUsedFromStorage() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    return new Set(saved ? JSON.parse(saved) : [])
  } catch {
    return new Set()
  }
}

function saveUsedToStorage(set) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...set]))
  } catch { /* ignore quota errors */ }
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [targetGoal, setTargetGoal] = useState(10)
  const [gameResults, setGameResults] = useState([])

  // Set of every word ever played — persists across rounds via localStorage
  const [usedWords, setUsedWords] = useState(loadUsedFromStorage)

  const { wordList, loading, loadError, loadWords, checkAndRefill } = useGemini()

  const handleStart = useCallback(async () => {
    setGameResults([])
    const ok = await loadWords(category, usedWords)
    if (ok) setScreen('game')
  }, [category, usedWords, loadWords])

  const handleGameEnd = useCallback((results) => {
    setGameResults(results)
    setScreen('summary')
    // Record played words in history
    setUsedWords((prev) => {
      const next = new Set(prev)
      results.forEach((r) => next.add(r.word))
      saveUsedToStorage(next)
      return next
    })
  }, [])

  const handleRestart = useCallback(() => {
    setScreen('setup')
  }, [])

  const handleClearHistory = useCallback(() => {
    setUsedWords(new Set())
    localStorage.removeItem(LS_KEY)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
      {screen === 'setup' && (
        <SetupScreen
          categories={CATEGORIES}
          category={category}
          setCategory={setCategory}
          targetGoal={targetGoal}
          setTargetGoal={setTargetGoal}
          onStart={handleStart}
          loading={loading}
          loadError={loadError}
          usedCount={usedWords.size}
          onClearHistory={handleClearHistory}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          wordList={wordList}
          targetGoal={targetGoal}
          category={category}
          onEnd={handleGameEnd}
          checkAndRefill={checkAndRefill}
        />
      )}
      {screen === 'summary' && (
        <SummaryScreen
          results={gameResults}
          targetGoal={targetGoal}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
