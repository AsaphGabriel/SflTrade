export async function fetchFarmData(farmId) {
  try {
    const targetUrl = `https://api.sunflower-land.com/community/farms/${farmId}`
    const proxyUrl = `https://sfltrade.asaphgabrielsousa.workers.dev/?url=${encodeURIComponent(targetUrl)}`
    const response = await fetch(proxyUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`)
    } else {
      const data = await response.json()
      console.log('API Response:', data)
      return data
    }
  } catch (error) {
    console.error('Error fetching farm data:', error)
    throw error
  }
}