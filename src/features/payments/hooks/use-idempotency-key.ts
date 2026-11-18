import { useCallback, useEffect, useRef, useState } from 'react'

function createKey(): string {
  return crypto.randomUUID()
}

export function useIdempotencyKey(dataFingerprint: string) {
  const [key, setKey] = useState<string | undefined>(createKey)
  const failedFingerprint = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      failedFingerprint.current !== undefined &&
      failedFingerprint.current !== dataFingerprint
    ) {
      failedFingerprint.current = undefined
      setKey(createKey())
    }
  }, [dataFingerprint])

  const markFailed = useCallback((fingerprint: string) => {
    failedFingerprint.current = fingerprint
  }, [])

  const markSucceeded = useCallback(() => {
    failedFingerprint.current = undefined
    setKey(undefined)
  }, [])

  return { key, markFailed, markSucceeded }
}
