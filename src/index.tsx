import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css' 

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} else {
  console.error('錯誤：在 index.html 中找不到 id 為 "root" 的元素')
}
