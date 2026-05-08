import { motion } from 'framer-motion'

export default function SetupScreen({
  categories, category, setCategory,
  targetGoal, setTargetGoal,
  onStart, loading, loadError,
  usedCount, onClearHistory,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-3xl font-extrabold text-white">派對猜謎</h1>
          <p className="text-white/60 mt-1 text-sm">右滑答對 ・ 左滑跳過</p>
        </div>

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-white/70 text-sm font-semibold mb-2 tracking-wide uppercase">
              題目類別
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer
                         text-base"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-800 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Target goal */}
          <div>
            <label className="block text-white/70 text-sm font-semibold mb-2 tracking-wide uppercase">
              目標答對題數
            </label>
            <input
              type="number"
              min={1}
              value={targetGoal}
              onChange={(e) => setTargetGoal(Math.max(1, Number(e.target.value)))}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-purple-400 text-base"
            />
          </div>

          {/* History badge + clear */}
          {usedCount > 0 && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-white/50 text-sm">
                歷史題庫已用 <span className="text-yellow-400 font-bold">{usedCount}</span> 題
              </span>
              <button
                onClick={onClearHistory}
                className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                清除紀錄
              </button>
            </div>
          )}

          {/* API error */}
          {loadError && (
            <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm text-center">
              {loadError.includes('所有模型') ? '所有 AI 模型額度已用完，請稍後再試' : `載入失敗：${loadError}`}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={onStart}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-extrabold text-lg text-white tracking-wide
                       bg-gradient-to-r from-purple-500 to-pink-500
                       hover:from-purple-400 hover:to-pink-400
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95 shadow-lg mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                載入題庫中…
              </span>
            ) : (
              '開始遊戲 🚀'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
