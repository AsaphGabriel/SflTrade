export function fetchFarmData(farmId) {
  return fetch(`https://sfltrade.asaphgabrielsousa.workers.dev/?url=https://api.sunflower-land.com/community/farms/${farmId}`)
}