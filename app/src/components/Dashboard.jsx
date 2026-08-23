import { useEffect, useState } from 'react'

export default function Dashboard({ projects, refreshKey, onNavigate, onComplete, onOpenTask }) {
  const [stats, setStats] = useState(null)
  const [todayTasks, setTodayTasks] = useState([])

  useEffect(() => {
    ;(async () => {
      setStats(await window.taskys.getStats())
      const all = await window.taskys.getTasks({})
      const today = new Date().toDateString()
      setTodayTasks(
        all
          .filter((t) => t.status !== 'done' && t.due_date && new Date(t.due_date).toDateString() === today)
          .sort((a, b) => (a.priority === 'high' ? -1 : 1))
          .slice(0, 6)
      )
    })()
  }, [refreshKey])

  if (!stats) return null

  const donePct = stats.totals.total
    ? Math.round((stats.totals.done / stats.totals.total) * 100)
    : 0

  const projectCounts = {}
  projects.forEach((p) => (projectCounts[p.id] = p))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="greeting">{greeting}</div>
      <div className="date-sub">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
        {' — '}
        {stats.today > 0 ? `${stats.today} task${stats.today > 1 ? 's' : ''} due today` : 'nothing due today'}
      </div>

      <div className="dashboard-grid">
        <div className="stat-card glass">
          <div className="stat-value">{stats.totals.pending ?? 0}</div>
          <div className="stat-label">Open tasks</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-value">{stats.totals.done ?? 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-value">{donePct}%</div>
          <div className="stat-label">Completion rate</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-value">{stats.today}</div>
          <div className="stat-label">Due today</div>
        </div>
      </div>

      <div className="section-label" style={{ paddingLeft: 4 }}>Due today</div>
      {todayTasks.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="big">✓</div>
          <p>All clear for today. Enjoy!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todayTasks.map((t) => (
            <div key={t.id} className="task-card glass">
              <button className="task-check" onClick={() => onComplete(t.id)}>✓</button>
              <div className="task-body" onClick={() => onOpenTask(t)} style={{ cursor: 'pointer' }}>
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className={`chip priority-${t.priority}`}>{t.priority}</span>
                  <span className="chip">{projectCounts[t.project_id]?.name || 'No project'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button className="btn" onClick={() => onNavigate({ type: 'pomodoro' })}>Start focus session</button>
        <button className="btn" onClick={() => onNavigate({ type: 'stats' })}>View statistics</button>
      </div>
    </div>
  )
}
