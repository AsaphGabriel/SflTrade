import React, { useState } from 'react'
import LandInfo from './components/LandInfo'

function App() {
  const [farmId, setFarmId] = useState('1')

  return (
    <div>
      <input type="text" value={farmId} onChange={(e) => setFarmId(e.target.value)} />
      <LandInfo farmId={farmId} />
    </div>
  )
}

export default App