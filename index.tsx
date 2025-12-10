import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 這裡抓取 index.html 裡的 <div id="root"> 並將 App 渲染進去
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
