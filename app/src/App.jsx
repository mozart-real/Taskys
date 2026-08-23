import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import TaskList from './components/TaskList.jsx'
import TaskModal from './components/TaskModal.jsx'
import Stats from './components/Stats.jsx'
import Pomodoro from './components/Pomodoro.jsx'

export default function App() {
  const [projects, setProjects] = useState([])
  const [view, setView] = useState(() => {
    const h = window.location.hash.replace('#/', '')
    return ['stats', 'pomodoro'].includes(h) ? { type: h } : { type: 'dashboard' }
  })
  const [tasks, setTasks] = useState([])
  const [editingTask, setEditingTask] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const searchRef = useRef(null)

  async function refreshProjects() {
    setProjects(await window.taskys.getProjects())
  }

  async function refreshTasks() {
    if (view.type === 'project') {
      setTasks(await window.taskys.getTasks({ projectId: view.id }))
    }
  }

  useEffect(() => { refreshProjects() }, [])

  useEffect(() => { refreshTasks() }, [view])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function openNewTask(projectId = null) {
    setEditingTask(null)
    setShowTaskModal({ projectId })
  }

  useEffect(() => {
    window.taskys.onNewTaskShortcut(() => {
      openNewTask(view.type === 'project' ? view.id : null)
    })
    window.taskys.onFocusSearchShortcut(() => searchRef.current?.focus())
    window.taskys.onPomodoroShortcut(() => setView({ type: 'pomodoro' }))
  }, [view])

  function bumpRefresh() {
    setRefreshKey((k) => k + 1)
  }

  async function handleComplete(id) {
    await window.taskys.completeTask(id)
    await Promise.all([refreshTasks(), refreshProjects()])
    bumpRefresh()
    showToast('Task completed')
  }

  async function handleDelete(id) {
    await window.taskys.deleteTask(id)
    await refreshTasks()
    bumpRefresh()
    showToast('Task deleted')
  }

  async function handleReorder(dragId, targetId) {
    if (dragId === targetId) return
    const ids = tasks.map((t) => t.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    await window.taskys.reorderTasks(ids)
    await refreshTasks()
  }

  async function handleSave(task) {
    if (task.id) {
      await window.taskys.updateTask(task)
      showToast('Task updated')
    } else {
      await window.taskys.createTask({ ...task, projectId: task.projectId ?? showTaskModal.projectId })
      showToast('Task created')
    }
    setShowTaskModal(false)
    await Promise.all([refreshTasks(), refreshProjects()])
    bumpRefresh()
  }

  const viewTitle =
    view.type === 'project'
      ? projects.find((p) => p.id === view.id)?.name || 'Project'
      : view.type === 'dashboard'
        ? ''
        : view.type === 'stats' ? 'Statistics' : 'Focus Timer'

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        view={view}
        onNavigate={setView}
        onNewTask={() => openNewTask()}
        onCreateProject={async (name) => {
          const id = await window.taskys.createProject({ name, color: '#ffffff' })
          await refreshProjects()
          setView({ type: 'project', id })
        }}
        onDeleteProject={async (id) => {
          await window.taskys.deleteProject(id)
          await refreshProjects()
          if (view.type === 'project' && view.id === id) setView({ type: 'dashboard' })
        }}
      />

      <div className="main">
        {view.type !== 'dashboard' && (
          <div className="topbar">
            <h1>{viewTitle}</h1>
            <div className="spacer" />
            {view.type === 'project' && (
              <input
                ref={(el) => (searchRef.current = el)}
                className="search-input"
                placeholder="Search…  (Ctrl+F)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            {view.type === 'project' && (
              <button className="btn btn-primary" onClick={() => openNewTask(view.id)}>
                + New Task
              </button>
            )}
          </div>
        )}

        <div className="content">
          {view.type === 'dashboard' && (
            <Dashboard
              projects={projects}
              refreshKey={refreshKey}
              onNavigate={setView}
              onComplete={handleComplete}
              onOpenTask={setEditingTask}
            />
          )}
          {view.type === 'project' && (
            <TaskList
              tasks={tasks.filter(
                (t) =>
                  !search ||
                  t.title.toLowerCase().includes(search.toLowerCase()) ||
                  t.description.toLowerCase().includes(search.toLowerCase())
              )}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onEdit={setEditingTask}
              onToggleSubtask={async (sid) => {
                await window.taskys.toggleSubtask(sid)
                await refreshTasks()
              }}
              onReorder={handleReorder}
              onNewTask={() => openNewTask(view.id)}
            />
          )}
          {view.type === 'stats' && <Stats />}
          {view.type === 'pomodoro' && (
            <Pomodoro
              projects={projects}
              onComplete={async (taskId) => {
                await handleComplete(taskId)
              }}
            />
          )}
        </div>
      </div>

      {(showTaskModal || editingTask) && (
        <TaskModal
          task={editingTask}
          projects={projects}
          defaultProjectId={showTaskModal?.projectId ?? null}
          onClose={() => {
            setShowTaskModal(false)
            setEditingTask(null)
          }}
          onSave={handleSave}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  )
}
