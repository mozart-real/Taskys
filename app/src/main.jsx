import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ReminderWindow from './ReminderWindow.jsx'
import './styles.css'

const isReminder = window.location.hash.includes('/reminder')
createRoot(document.getElementById('root')).render(
  isReminder ? <ReminderWindow /> : <App />
)
