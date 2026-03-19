import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode removed — it causes double API calls in development
// which creates duplicate Chain of Custody entries
createRoot(document.getElementById('root')).render(
  <App />
)
