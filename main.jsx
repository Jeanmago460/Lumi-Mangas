import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Este comando localiza o 'root' no index.html e injeta o App.jsx lá dentro
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
