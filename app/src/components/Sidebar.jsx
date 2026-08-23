import { useState } from 'react'

export default function Sidebar({ projects, view, onNavigate, onNewTask, onCreateProject, onDeleteProject }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function submitProject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await onCreateProject(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const navItem = (type, icon, label, extra) => (
    <div
      className={`nav-item ${view.type === type ? 'active' : ''}`}
      onClick={() => onNavigate({ type })}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {extra}
    </div>
  )

  return (
    <aside className="sidebar glass">
      <div className="logo">
        <div className="logo-mark">T</div>
        Taskys
      </div>

      {navItem('dashboard', '', 'Today')}
      {navItem('stats', '', 'Statistics')}
      {navItem('pomodoro', '', 'Focus Timer')}

      <div className="section-label">
        Projects
        <span className="section-add" onClick={() => setCreating(!creating)}>+</span>
      </div>

      {projects.map((p) => (
        <div
          key={p.id}
          className={`nav-item ${view.type === 'project' && view.id === p.id ? 'active' : ''}`}
          onClick={() => onNavigate({ type: 'project', id: p.id })}
        >
          <span className="nav-dot" style={{ background: p.color }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </span>
          <span
            className="section-add"
            title="Delete project"
            onClick={(e) => {
              e.stopPropagation()
              if (p.name !== 'Inbox' && confirm(`Delete "${p.name}" and all its tasks?`)) {
                onDeleteProject(p.id)
              }
            }}
          >
            ×
          </span>
        </div>
      ))}

      {creating && (
        <form onSubmit={submitProject} style={{ padding: '4px 0' }}>
          <input
            autoFocus
            placeholder="Project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => !newName && setCreating(false)}
            style={{ padding: '7px 12px' }}
          />
        </form>
      )}

      <div className="sidebar-footer">
        <button className="btn btn-primary" onClick={onNewTask}>
          + New Task <span style={{ opacity: 0.5, fontSize: 11 }}>Ctrl+N</span>
        </button>
      </div>
    </aside>
  )
}
