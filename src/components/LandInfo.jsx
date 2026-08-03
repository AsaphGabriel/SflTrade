import React, { useEffect, useState } from 'react'
import { fetchFarmData } from '../services/api'

function LandInfo({ farmId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadFarmData() {
      try {
        setLoading(true)
        const farmData = await fetchFarmData(farmId)
        setData(farmData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadFarmData()
  }, [farmId])

  if (loading) return <div>⏳ Carregando dados da Land...</div>
  if (error) return <div style={{color: 'red'}}>⚠️ Erro: {error}</div>

  return (
    <div>
      <h2>Farm ID: {farmId}</h2>
      <pre style={{background: '#f4f4f4', padding: '10px', overflowX: 'auto'}}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default LandInfo