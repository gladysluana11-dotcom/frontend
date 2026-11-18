import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'

export function usePrivateStudentSearch() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)

  useEffect(() => {
    if (!params.has('buscar')) return
    const next = new URLSearchParams(params)
    next.delete('buscar')
    setParams(next, { replace: true })
  }, [params, setParams])

  return { search, setSearch, debouncedSearch }
}
