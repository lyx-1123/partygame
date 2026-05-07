import { useEffect, useRef } from 'react'

export function useGameControls({ onCorrect, onPass, enabled }) {
  const enabledRef = useRef(enabled)
  const onCorrectRef = useRef(onCorrect)
  const onPassRef = useRef(onPass)
  const cooldownRef = useRef(false)

  enabledRef.current = enabled
  onCorrectRef.current = onCorrect
  onPassRef.current = onPass

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!enabledRef.current || cooldownRef.current) return
      if (e.key === 'ArrowRight') {
        cooldownRef.current = true
        onCorrectRef.current()
        setTimeout(() => { cooldownRef.current = false }, 400)
      } else if (e.key === 'ArrowLeft') {
        cooldownRef.current = true
        onPassRef.current()
        setTimeout(() => { cooldownRef.current = false }, 400)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
