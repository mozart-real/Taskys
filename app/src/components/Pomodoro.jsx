import { useEffect, useRef, useState } from 'react'
import { playAlarmOnce } from '../lib/sound.js'

const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' }

export default function Pomodoro() {
  const [config, setConfig] = useState({ focus: 25, short: 5, long: 15 })
  const [mode, setMode] = useState('focus')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles] = useState(0)
  const [linkedTaskId, setLinkedTaskId] = useState('')
  const [pendingTasks, setPendingTasks] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    window.taskys.getSetting('pomodoro').then((v) => {
      if (v) {
        const c = JSON.parse(v)
        setConfig(c)
        setSecondsLeft(c.focus * 60)
      }
    })
    window.taskys.getTasks({ status: 'pending' }).then(setPendingTasks)
  }, [])

  useEffect(() => {
    if (!running) return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // finished
        clearInterval(timerRef.current)
        playAlarmOnce()
        setTimeout(playAlarmOnce, 600)
        if (mode === 'focus') {
          const c = cycles + 1
          setCycles(c)
          const nextMode = c % 4 === 0 ? 'long' : 'short'
          switchTo(nextMode)
        } else {
          switchTo('focus')
        }
        setRunning(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [running, mode, cycles])

  function switchTo(m) {
    setMode(m)
    setSecondsLeft(config[m] * 60)
  }

  function updateConfig(key, value) {
    const c = { ...config, [key]: Math.max(1, Number(value) || 1) }
    setConfig(c)
    window.taskys.setSetting('pomodoro', JSON.stringify(c))
    if (!running && mode === key) setSecondsLeft(c[key] * 60)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const linkedTask = pendingTasks.find((t) => t.id === Number(linkedTaskId))
  const total = config[mode] * 60
  const pct = total ? (1 - secondsLeft / total) * 100 : 0

  return (
    <div className="pomodoro-panel glass" style={{ maxWidth: 560, margin: '30px auto' }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {Object.entries(MODES).map(([k, label]) => (
          <button
            key={k}
            className={`btn btn-sm ${mode === k ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { switchTo(k); setRunning(false) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="pomo-ring"
        style={{
          width: 260, height: 260,
          borderRadius: '50%',
          background: `conic-gradient(#ffffff ${pct}%, rgba(255,255,255,0.07) ${pct}%)`,
          display: 'grid', placeItems: 'center',
          marginTop: 26,
          boxShadow: running ? '0 0 60px rgba(255,255,255,0.12)' : 'none',
          transition: 'box-shadow 0.5s ease',
        }}
      >
        <div style={{
          width: 232, height: 232, borderRadius: '50%',
          background: '#0d0d0d', display: 'grid', placeItems: 'center',
        }}>
          <div>
            <div className="pomo-time" style={{ fontSize: 52 }}>{mm}:{ss}</div>
            <div className="pomo-mode">{MODES[mode]} · cycle {cycles % 4 + 1}/4</div>
          </div>
        </div>
      </div>

      <div className="pomo-controls">
        <button className="btn btn-primary" onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="btn" onClick={() => { switchTo(mode); setRunning(false) }}>Reset</button>
      </div>

      {linkedTask && (
        <div className="pomo-task">
          Focusing on: <strong>{linkedTask.title}</strong>
          {' — '}
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => window.taskys.completeTask(linkedTask.id)}
          >
            mark done
          </button>
        </div>
      )}

      <div className="pomo-settings">
        {Object.entries(MODES).map(([k, label]) => (
          <label className="field" key={k}>
            {label.split(' ')[0]} (min)
            <input
              type="number"
              min={1}
              max={120}
              value={config[k]}
              onChange={(e) => updateConfig(k, e.target.value)}
              style={{ padding: '6px 10px' }}
            />
          </label>
        ))}
      </div>

      <div className="pomo-settings" style={{ maxWidth: 300, margin: '18px auto 0' }}>
        <label className="field">
          Link a task
          <select value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)}>
            <option value="">None</option>
            {pendingTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
