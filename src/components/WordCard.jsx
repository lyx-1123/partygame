import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

const variants = {
  initial: { opacity: 0, scale: 0.85, y: 30 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: (dir) => ({
    x: dir === 'correct' ? 600 : -600,
    opacity: 0,
    rotate: dir === 'correct' ? 22 : -22,
    transition: { duration: 0.32, ease: 'easeIn' },
  }),
}

export default function WordCard({ word, onCorrect, onPass }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-18, 18])
  const correctOpacity = useTransform(x, [30, 110], [0, 1])
  const passOpacity = useTransform(x, [-110, -30], [1, 0])

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 90) {
      onCorrect()
    } else if (info.offset.x < -90) {
      onPass()
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }

  return (
    <motion.div
      drag="x"
      dragElastic={0.65}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ x, rotate }}
      className="relative bg-white rounded-3xl shadow-2xl flex items-center justify-center
                 w-72 h-44 sm:w-80 sm:h-52 md:w-96 md:h-64
                 cursor-grab active:cursor-grabbing select-none touch-none"
    >
      {/* Correct (right swipe) overlay */}
      <motion.div
        style={{ opacity: correctOpacity }}
        className="absolute inset-0 rounded-3xl bg-green-400/20 border-4 border-green-400 flex items-center justify-end pr-6 pointer-events-none"
      >
        <span className="text-green-500 font-extrabold text-3xl">✓</span>
      </motion.div>

      {/* Pass (left swipe) overlay */}
      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute inset-0 rounded-3xl bg-red-400/20 border-4 border-red-400 flex items-center pl-6 pointer-events-none"
      >
        <span className="text-red-500 font-extrabold text-3xl">✗</span>
      </motion.div>

      <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-800 z-10 px-4 text-center">
        {word}
      </span>
    </motion.div>
  )
}
