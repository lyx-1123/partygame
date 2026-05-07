import { motion } from 'framer-motion'

export default function SummaryScreen({ results, targetGoal, onRestart }) {
  const correct = results.filter((r) => r.result === 'correct')
  const passed = results.filter((r) => r.result === 'pass')
  const totalSeconds = results.reduce((acc, r) => acc + r.seconds, 0).toFixed(1)

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4 overflow-y-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center mb-6">
          <div className="text-5xl mb-2">🎉</div>
          <h1 className="text-3xl font-extrabold text-white">遊戲結束！</h1>
          <p className="text-white/50 mt-1 text-sm">目標：{targetGoal} 題</p>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-green-400">{correct.length}</div>
            <div className="text-white/50 text-xs mt-1">答對</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-red-400">{passed.length}</div>
            <div className="text-white/50 text-xs mt-1">PASS</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-yellow-400">{totalSeconds}s</div>
            <div className="text-white/50 text-xs mt-1">總時間</div>
          </div>
        </motion.div>

        {/* Correct list */}
        {correct.length > 0 && (
          <motion.div variants={item} className="mb-4">
            <h2 className="text-green-400 font-bold text-sm tracking-widest uppercase mb-2">✅ 答對</h2>
            <div className="space-y-2">
              {correct.map((r, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3"
                >
                  <span className="text-white font-semibold text-lg">{r.word}</span>
                  <span className="text-green-400 text-sm font-bold">{r.seconds}s</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pass list */}
        {passed.length > 0 && (
          <motion.div variants={item} className="mb-6">
            <h2 className="text-red-400 font-bold text-sm tracking-widest uppercase mb-2">❌ PASS</h2>
            <div className="space-y-2">
              {passed.map((r, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <span className="text-white font-semibold text-lg">{r.word}</span>
                  <span className="text-red-400 text-sm font-bold">{r.seconds}s</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Restart */}
        <motion.button
          variants={item}
          onClick={onRestart}
          className="w-full py-4 rounded-2xl font-extrabold text-lg text-white
                     bg-gradient-to-r from-purple-500 to-pink-500
                     hover:from-purple-400 hover:to-pink-400
                     transition-all duration-200 active:scale-95 shadow-lg"
        >
          再玩一次 🔄
        </motion.button>
      </motion.div>
    </div>
  )
}
