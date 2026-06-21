import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { KanbanProvider } from './store/KanbanContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KanbanProvider>
      <App />
    </KanbanProvider>
  </StrictMode>,
)
