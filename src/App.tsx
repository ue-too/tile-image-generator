import NumberGenerator from './TileGenerator'
import { Toaster } from 'react-hot-toast'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      <div className="container mx-auto py-8">
        <NumberGenerator />
      </div>
    </div>
  )
}

export default App
