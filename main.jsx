import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Este é o comando que injeta o React no seu HTML
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

