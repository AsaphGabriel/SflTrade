export async function fetchFarmData(farmId) {
  try {
    const targetUrl = `https://api.sunflower-land.com/community/farms/${farmId}`
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`)
    } else {
      return await response.json()
    }
  } catch (error) {
    console.error('Error fetching farm data:', error)
    throw error
  }
}