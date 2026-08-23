import { useState } from 'react'

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TaskModal({ task, projects, defaultProjectId, onClose, onSave }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [projectId, setProjectId] = useState(
    task?.project_id ?? defaultProjectId ?? projects[0]?.id ?? null
  )
  const [dueDate, setDueDate] = useState(toLocalInput(task?.due_date))
  const [remindAt, setRemindAt] = useState(toLocalInput(task?.remind_at))
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'none')
  const [subtasks, setSubtasks] = useState(
    task?.subtasks?.map((s) => ({ title: s.title, done: !!s.done })) || []
  )
  const [newSubtask, setNewSubtask] = useState('')

  function addSubtask() {
    if (!newSubtask.trim()) return
    setSubtasks([...subtasks, { title: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      id: task?.id,
      title: title.trim(),
      description,
      priority,
      projectId: projectId === '' ? null : Number(projectId),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      remindAt: remindAt ? new Date(remindAt).toISOString() : null,
      recurrence,
      subtasks,
    })
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal glass" onSubmit={submit}>
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>

        <div className="fields">
          <label className="field">
            Title
            <input
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field">
            Description
            <textarea
              rows={2}
              placeholder="Optional details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="row">
            <label className="field">
              Project
              <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="field">
              Repeat
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          <div className="row">
            <label className="field">
              Due date
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className="field">
              Remind me at
              <input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
            </label>
          </div>

          <div className="field" style={{ textTransform: 'none', letterSpacing: 0 }}>
            Subtasks
            {subtasks.map((s, i) => (
              <div key={i} className="subtask-row">
                <span>·</span>
                <span>{s.title}</span>
                <span
                  className="subtask-remove"
                  onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                >
                  ✕
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Add subtask…"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                style={{ marginTop: 4 }}
              />
              <button type="button" className="btn btn-sm" onClick={addSubtask} style={{ marginTop: 4 }}>
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{task ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </div>
  )
}
