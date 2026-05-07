import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import WordCard from './WordCard'
import { useGameControls } from '../hooks/useGameControls'

export default function GameScreen({ wordList, targetGoal, category, onEnd, checkAndRefill }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [results, setResults] = useState([])
  const [exitDirection, setExitDirection] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const startTimeRef = useRef(Date.now())
  const pendingEndRef = useRef(null)

  const currentWord = wordList[currentIndex]
  // Block input while animating OR while buffer is empty (awaiting refill)
  const inputEnabled = !isAnimating && !!currentWord

  const handleAction = useCallback((type) => {
    if (isAnimating) return

    const seconds = parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
    const word = wordList[currentIndex]
    const newResult = { word, result: type, seconds }
    const newResults = [...results, newResult]
    const newCorrectCount = type === 'correct' ? correctCount + 1 : correctCount

    setResults(newResults)
    if (type === 'correct') setCorrectCount(newCorrectCount)
    setExitDirection(type)
    setIsAnimating(true)
    setCurrentIndex((prev) => prev + 1)

    checkAndRefill(currentIndex + 1, category)

    if (type === 'correct' && newCorrectCount >= targetGoal) {
      pendingEndRef.current = newResults
    }
  }, [isAnimating, wordList, currentIndex, results, correctCount, targetGoal, category, checkAndRefill])

  const handleExitComplete = useCallback(() => {
    if (pendingEndRef.current) {
      onEnd(pendingEndRef.current)
      return
    }
    // Always clear the animation lock here — even if buffer is empty the timer resets
    setExitDirection(null)
    setIsAnimating(false)
    startTimeRef.current = Date.now()
  }, [onEnd])

  useGameControls({
    onCorrect: () => handleAction('correct'),
    onPass: () => handleAction('pass'),
    enabled: inputEnabled,
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-10 px-4">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-sm">答對進度</span>
          <span className="text-white font-bold text-sm">{correctCount} / {targetGoal}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
            animate={{ width: `${(correctCount / targetGoal) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Card area — AnimatePresence stays mounted at all times */}
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '260px' }}>
        <AnimatePresence custom={exitDirection} onExitComplete={handleExitComplete} mode="wait">
          {currentWord && (
            <WordCard
              key={currentIndex}
              word={currentWord}
              onCorrect={() => handleAction('correct')}
              onPass={() => handleAction('pass')}
            />
          )}
        </AnimatePresence>

        {/* Shown only while buffer is being refilled (currentWord momentarily undefined) */}
        {!currentWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-white/50"
          >
            <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">載入更多題目…</span>
          </motion.div>
        )}
      </div>

      {/* Bottom hints */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-10 text-sm text-white/40"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl">👈</span>
          <span>左滑 / ← PASS</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl">👉</span>
          <span>右滑 / → 答對</span>
        </div>
      </motion.div>
    </div>
  )
}
