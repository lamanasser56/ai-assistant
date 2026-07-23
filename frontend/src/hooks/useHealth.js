import { useCallback, useEffect, useState } from 'react'
import { platformApi } from '../services/api'

export default function useHealth() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await platformApi.health()); setLastChecked(new Date()) }
    catch (requestError) { setData({}); setError(requestError.message); setLastChecked(new Date()) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { data, loading, error, lastChecked, refresh }
}
