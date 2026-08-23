import { useEffect, useRef, useState } from 'react'
import { createAlarmLoop } from './lib/sound.js'

export default function ReminderWindow() {
  const [task, setTask] = useState(null)
  const alarmRef = useRef(null)

  useEffect(() => {
    window.reminder.getTask().then((t) => t && setTask(t))
    window.reminder.show((t) => setTask(t))
    window.reminder.update((t) => setTask(t))
    return () => alarmRef.current?.stop()
  }, [])

  useEffect(() => {
    if (task) alarmRef.current = createAlarmLoop()
    return () => alarmRef.current?.stop()
  }, [task])

  if (!task) return null

  const stopAnd = (fn) => {
    alarmRef.current?.stop()
    fn()
    window.close()
  }

  return (
    <div className="reminder-popup">
      <div className="reminder-glow" />
      <div className="reminder-icon">!</div>
      <h2>{task.title}</h2>
      {task.description && <p className="reminder-desc">{task.description}</p>}
      <p className="reminder-time">
        {new Date(task.due_date || Date.now()).toLocaleString('en-US', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
        })}
      </p>
      <div className="reminder-actions">
        <button
          className="btn btn-ghost"
          onClick={() => stopAnd(() => window.reminder.snooze(task.id, 5))}
        >
          Snooze 5m
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => stopAnd(() => window.reminder.snooze(task.id, 15))}
        >
          15m
        </button>
        <button className="btn btn-primary" onClick={() => stopAnd(() => window.reminder.done(task.id))}>
          Done
        </button>
      </div>
    </div>
  )
}
