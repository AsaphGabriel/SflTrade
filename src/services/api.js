export function fetchFarmData(farmId) {
  try {
    const response = await fetch(`https://sfltrade.asaphgabrielsousa.workers.dev/?url=https://api.sunflower-land.com/community/farms/${farmId}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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