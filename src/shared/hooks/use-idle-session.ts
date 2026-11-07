import { useEffect, useState } from 'react'

const warningAfterMs = 25 * 60 * 1000
const logoutAfterMs = 30 * 60 * 1000
const activityEvents = [
  'keydown',
  'mousedown',
  'pointerdown',
  'scroll',
  'touchstart',
  'mousemove',
] as const

export function useIdleSession(
  enabled: boolean,
  onTimeout: () => void,
): boolean {
  const [warningVisible, setWarningVisible] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setWarningVisible(false)
      return
    }

    let warningTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    const resetTimers = () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      setWarningVisible(false)
      warningTimer = setTimeout(() => setWarningVisible(true), warningAfterMs)
      logoutTimer = setTimeout(onTimeout, logoutAfterMs)
    }

    resetTimers()
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetTimers, { passive: true }),
    )

    return () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetTimers),
      )
    }
  }, [enabled, onTimeout])

  return enabled && warningVisible
}
