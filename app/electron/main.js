const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { DatabaseSync } = require('node:sqlite')
const notifier = require('node-notifier')

let mainWindow = null
let reminderPopup = null
let currentReminder = null
let db
let checkInterval = null

const DATA_DIR = path.join(process.env.HOME, '.local', 'share', 'taskys')
const DB_PATH = path.join(DATA_DIR, 'taskys.db')

function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#ffffff',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      remind_at TEXT,
      recurrence TEXT DEFAULT 'none',
      position INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  if (!db.prepare('SELECT COUNT(*) as c FROM projects').get().c) {
    db.prepare("INSERT INTO projects (name) VALUES ('Inbox')").run()
  }
}

// ---------- helpers ----------
function nextOccurrence(dueDate, recurrence) {
  const d = new Date(dueDate)
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    default: return null
  }
  return d.toISOString()
}

function taskWithSubtasks(row) {
  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(row.id)
  return { ...row, subtasks }
}

// ---------- IPC ----------
ipcMain.handle('db:getProjects', () =>
  db.prepare('SELECT * FROM projects ORDER BY position, id').all()
)

ipcMain.handle('db:createProject', (_e, { name, color }) => {
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),0)+1 as p FROM projects').get().p
  return db.prepare('INSERT INTO projects (name, color, position) VALUES (?, ?, ?)').run(name, color || '#ffffff', maxPos).lastInsertRowid
})

ipcMain.handle('db:updateProject', (_e, { id, name, color }) => {
  db.prepare('UPDATE projects SET name = ?, color = ? WHERE id = ?').run(name, color, id)
  return true
})

ipcMain.handle('db:deleteProject', (_e, id) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return true
})

ipcMain.handle('db:getTasks', (_e, filters = {}) => {
  let sql = 'SELECT * FROM tasks'
  const where = []
  const params = []
  if (filters.projectId !== undefined && filters.projectId !== null && filters.projectId !== 'all') {
    where.push('project_id = ?')
    params.push(filters.projectId)
  }
  if (filters.status) {
    where.push('status = ?')
    params.push(filters.status)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY position, id DESC'
  return db.prepare(sql).all(...params).map(taskWithSubtasks)
})

ipcMain.handle('db:createTask', (_e, t) => {
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),0)+1 as p FROM tasks WHERE project_id IS ?').get(t.projectId ?? null).p
  const info = db.prepare(`
    INSERT INTO tasks (project_id, title, description, priority, due_date, remind_at, recurrence, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.projectId ?? null, t.title, t.description || '',
    t.priority || 'medium', t.dueDate || null, t.remindAt || null,
    t.recurrence || 'none', maxPos
  )
  for (const [i, s] of (t.subtasks || []).entries()) {
    db.prepare('INSERT INTO subtasks (task_id, title, position) VALUES (?, ?, ?)').run(info.lastInsertRowid, s.title, i)
  }
  return info.lastInsertRowid
})

ipcMain.handle('db:updateTask', (_e, t) => {
  db.prepare(`
    UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=?, remind_at=?, recurrence=?, project_id=?
    WHERE id=?
  `).run(
    t.title, t.description || '', t.priority || 'medium', t.status || 'pending',
    t.dueDate || null, t.remindAt || null, t.recurrence || 'none',
    t.projectId ?? null, t.id
  )
  if (t.subtasks) {
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(t.id)
    for (const [i, s] of t.subtasks.entries()) {
      db.prepare('INSERT INTO subtasks (task_id, title, done, position) VALUES (?, ?, ?, ?)')
        .run(t.id, s.title, s.done ? 1 : 0, i)
    }
  }
  return true
})

ipcMain.handle('db:completeTask', (_e, id) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!task || task.status === 'done') return false
  if (task.recurrence && task.recurrence !== 'none' && task.due_date) {
    // record this occurrence as a hidden done row (for stats history)...
    db.prepare(`INSERT INTO tasks
      (project_id, title, description, priority, due_date, recurrence, position, status, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT position FROM tasks WHERE id=?), 'done', datetime('now'))`)
      .run(task.project_id, task.title, task.description, task.priority, task.due_date, task.recurrence, id)
    // ...and reschedule the SAME row to its next occurrence (no visible duplicate)
    const next = nextOccurrence(task.due_date, task.recurrence)
    if (next) {
      db.prepare("UPDATE tasks SET due_date=?, remind_at=NULL, status='pending' WHERE id=?").run(next, id)
    } else {
      db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(id)
    }
  } else {
    db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(id)
  }
  return true
})

ipcMain.handle('db:deleteTask', (_e, id) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return true
})

ipcMain.handle('db:reorderTasks', (_e, orderedIds) => {
  const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    orderedIds.forEach((id, i) => stmt.run(i, id))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return true
})

ipcMain.handle('db:toggleSubtask', (_e, subtaskId) => {
  db.prepare('UPDATE subtasks SET done = CASE WHEN done=1 THEN 0 ELSE 1 END WHERE id = ?').run(subtaskId)
  return true
})

ipcMain.handle('db:getStats', () => {
  const byDay = db.prepare(`
    SELECT date(completed_at) as day, COUNT(*) as count
    FROM tasks WHERE completed_at IS NOT NULL AND completed_at > datetime('now','-14 days')
    GROUP BY day ORDER BY day
  `).all()
  const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all()
  const byProject = db.prepare(`
    SELECT p.name, COUNT(t.id) as count FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id ORDER BY count DESC
  `).all()
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending
    FROM tasks
  `).get()
  const today = db.prepare(`
    SELECT COUNT(*) as c FROM tasks WHERE date(due_date)=date('now') AND status != 'done'
  `).get().c
  return { byDay, byPriority, byProject, totals, today }
})

ipcMain.handle('db:getSetting', (_e, key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
})

ipcMain.handle('db:setSetting', (_e, { key, value }) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value))
  return true
})

// ---------- notifications ----------
function showReminderPopup(task) {
  currentReminder = task
  if (reminderPopup && !reminderPopup.isDestroyed()) {
    reminderPopup.webContents.send('reminder:update', task)
    reminderPopup.focus()
    return
  }
  reminderPopup = new BrowserWindow({
    width: 380,
    height: 260,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'popupPreload.js'),
      contextIsolation: true,
    },
  })
  reminderPopup.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: '/reminder' })
  reminderPopup.on('closed', () => {
    if (currentReminder && reminderPopup && reminderPopup.isDestroyed()) currentReminder = null
  })
}

function playAlarm() {
  mainWindow?.webContents.send('alarm:play')
}

function snoozeTask(id, minutes) {
  const task = db.prepare('SELECT remind_at FROM tasks WHERE id = ?').get(id)
  if (!task) return
  const base = new Date()
  base.setMinutes(base.getMinutes() + minutes)
  db.prepare('UPDATE tasks SET remind_at = ? WHERE id = ?').run(base.toISOString(), id)
}

ipcMain.handle('reminder:get-current', () => currentReminder)

ipcMain.handle('reminder:snooze', (_e, { id, minutes }) => {
  snoozeTask(id, minutes)
  currentReminder = null
  if (reminderPopup && !reminderPopup.isDestroyed()) reminderPopup.close()
  return true
})

ipcMain.handle('reminder:done', (_e, id) => {
  ipcHandlers.completeTask(null, id)
  currentReminder = null
  if (reminderPopup && !reminderPopup.isDestroyed()) reminderPopup.close()
  return true
})

ipcMain.handle('reminder:dismiss', () => {
  currentReminder = null
  if (reminderPopup && !reminderPopup.isDestroyed()) reminderPopup.close()
  return true
})

ipcMain.handle('notify:desktop', (_e, { title, body }) => {
  notifier.notify({ title, message: body, icon: path.join(__dirname, '..', 'src', 'assets', 'icon.png'), sound: false })
})

const ipcHandlers = {
  completeTask: (_e, id) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!task || task.status === 'done') return false
    if (task.recurrence && task.recurrence !== 'none' && task.due_date) {
      db.prepare(`INSERT INTO tasks
        (project_id, title, description, priority, due_date, recurrence, position, status, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, (SELECT position FROM tasks WHERE id=?), 'done', datetime('now'))`)
        .run(task.project_id, task.title, task.description, task.priority, task.due_date, task.recurrence, id)
      const next = nextOccurrence(task.due_date, task.recurrence)
      if (next) {
        db.prepare("UPDATE tasks SET due_date=?, remind_at=NULL, status='pending' WHERE id=?").run(next, id)
      } else {
        db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(id)
      }
    } else {
      db.prepare("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?").run(id)
    }
    return true
  },
}

function checkReminders() {
  const now = new Date().toISOString().slice(0, 16)
  const due = db.prepare(`
    SELECT * FROM tasks
    WHERE remind_at IS NOT NULL AND status = 'pending' AND substr(remind_at, 1, 16) <= ?
  `).all(now)
  for (const task of due) {
    // clear remind so we don't spam every tick; popup handles snooze re-set
    db.prepare('UPDATE tasks SET remind_at = NULL WHERE id = ?').run(task.id)
    showReminderPopup(task)
    playAlarm()
    new Notification({ title: 'Taskys: ' + task.title, body: task.description || 'Time to do this task!' }).show()
  }
}

// ---------- window ----------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'src', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const viewArg = process.argv.find((a) => a.startsWith('--view='))
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'),
      viewArg ? { hash: '/' + viewArg.split('=')[1] } : undefined)
  }

  registerShortcuts()
}

function registerShortcuts() {
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.control && input.key.toLowerCase() === 'n') {
      mainWindow.webContents.send('shortcut:new-task')
    }
    if (input.control && input.key.toLowerCase() === 'f') {
      mainWindow.webContents.send('shortcut:focus-search')
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'p') {
      mainWindow.webContents.send('shortcut:pomodoro')
    }
  })
}

app.whenReady().then(() => {
  initDb()
  createMainWindow()
  checkReminders()
  checkInterval = setInterval(checkReminders, 30_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  clearInterval(checkInterval)
  if (process.platform !== 'darwin') app.quit()
})
