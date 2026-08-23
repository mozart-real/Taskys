function fmtDue(due) {
  if (!due) return null
  const d = new Date(due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = d >= today && d < new Date(today.getTime() + 86400000)
  const overdue = d < today
  return {
    label: isToday ? 'Today' : d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    overdue,
  }
}

export default function TaskCard({ task, onComplete, onDelete, onEdit, onToggleSubtask, onDragStart, onDragOver, onDrop, dragging }) {
  const doneSubs = task.subtasks.filter((s) => s.done).length
  const progress = task.subtasks.length ? (doneSubs / task.subtasks.length) * 100 : null
  const due = fmtDue(task.due_date)

  return (
    <div
      className={`task-card glass ${task.status === 'done' ? 'done' : ''} ${dragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragOver={(e) => onDragOver?.(e, task.id)}
      onDrop={(e) => onDrop?.(e, task.id)}
    >
      <button
        className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
        onClick={() => task.status !== 'done' && onComplete(task.id)}
      >
        ✓
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}

        <div className="task-meta">
          <span className={`chip priority-${task.priority}`}>
            {task.priority.toUpperCase()}
          </span>
          {due && (
            <span className={`chip ${due.overdue ? 'due-overdue' : ''}`}>
              Due {due.label}{due.overdue ? ' - overdue' : ''}
            </span>
          )}
          {task.recurrence !== 'none' && (
            <span className="chip recurring">Repeats {task.recurrence}</span>
          )}
          {task.subtasks.length > 0 && (
            <span className="chip">Subtasks {doneSubs}/{task.subtasks.length}</span>
          )}
        </div>

        {progress !== null && (
          <div className="task-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="task-actions">
        <button className="icon-btn" title="Edit" onClick={() => onEdit(task)}>Edit</button>
        <button className="icon-btn danger" title="Delete" onClick={() => onDelete(task.id)}>x</button>
      </div>
    </div>
  )
}
