import { useState } from 'react'
import TaskCard from './TaskCard.jsx'

export default function TaskList({ tasks, onComplete, onDelete, onEdit, onToggleSubtask, onReorder, onNewTask }) {
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [showDone, setShowDone] = useState(false)

  const pending = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')
  const visible = showDone ? [...pending, ...done] : pending

  if (!tasks.length) {
    return (
        <div className="empty-state">
          <div className="big">·</div>
          <h3>No tasks yet</h3>
        <p>Create your first task with Ctrl+N or the button below.</p>
        <button className="btn btn-primary" onClick={onNewTask}>+ New Task</button>
      </div>
    )
  }

  return (
    <div>
      {done.length > 0 && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ marginBottom: 12, color: 'var(--text-dim)' }}
          onClick={() => setShowDone(!showDone)}
        >
          {showDone ? '▾' : '▸'} {done.length} completed
        </button>
      )}
      <div className="task-list">
        {visible.map((t) => (
          <div
            key={t.id}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverId(t.id)
            }}
            onDragLeave={() => setDragOverId(null)}
            style={{ position: 'relative', borderRadius: 16 }}
            className={dragOverId === t.id && dragId !== t.id ? 'drag-over-target' : ''}
          >
            <TaskCard
              task={t}
              onComplete={onComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleSubtask={onToggleSubtask}
              dragging={dragId === t.id}
              onDragStart={() => setDragId(t.id)}
              onDrop={(e, targetId) => {
                e.preventDefault()
                if (dragId) onReorder(dragId, targetId)
                setDragId(null)
                setDragOverId(null)
              }}
            />
          </div>
        ))}
      </div>
      {pending.length === 0 && done.length > 0 && (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="big">✓</div>
          <p>All tasks completed. Nice work!</p>
        </div>
      )}
    </div>
  )
}
