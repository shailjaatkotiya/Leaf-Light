import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Deliberately not wrapped in <React.StrictMode>: Strict Mode double-invokes
// effects in development, which would fetch and parse the .glb twice. On a
// 300 MB model that is a slow, memory-hungry way to start the app.
createRoot(document.getElementById('root')).render(<App />)
