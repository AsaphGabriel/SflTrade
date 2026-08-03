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
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadFarmData()
  }, [farmId])

  if (loading) return <div>⏳ Carregando dados da Land...</div>
  if (error) return <div>⚠️ Erro ao buscar dados da Land. Verifique o console.</div>

  return (
    <div>
      <h2>Farm ID: {farmId}</h2>
      <div>Coins: {data?.state?.coins || 'N/A'}</div>
      <div>Diamonds: {data?.state?.diamonds || 'N/A'}</div>
      <div>Flowers: {data?.state?.flowers || 'N/A'}</div>
      <div>Level: {data?.state?.level || 'N/A'}</div>
      <div>Harvests: {data?.state?.harvests || 'N/A'}</div>
      <div>Animals: {data?.state?.animals || 'N/A'}</div>
    </div>
  )
}

export default LandInfo