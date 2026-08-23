const { contextBridge, ipcRenderer } = require('electron')

function on(channel, cb) {
  ipcRenderer.removeAllListeners(channel)
  ipcRenderer.on(channel, (_e, ...args) => cb(...args))
}

contextBridge.exposeInMainWorld('taskys', {
  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  createProject: (data) => ipcRenderer.invoke('db:createProject', data),
  updateProject: (data) => ipcRenderer.invoke('db:updateProject', data),
  deleteProject: (id) => ipcRenderer.invoke('db:deleteProject', id),

  getTasks: (filters) => ipcRenderer.invoke('db:getTasks', filters),
  createTask: (task) => ipcRenderer.invoke('db:createTask', task),
  updateTask: (task) => ipcRenderer.invoke('db:updateTask', task),
  completeTask: (id) => ipcRenderer.invoke('db:completeTask', id),
  deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),
  reorderTasks: (ids) => ipcRenderer.invoke('db:reorderTasks', ids),
  toggleSubtask: (id) => ipcRenderer.invoke('db:toggleSubtask', id),

  getStats: () => ipcRenderer.invoke('db:getStats'),
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', { key, value }),

  desktopNotify: (title, body) => ipcRenderer.invoke('notify:desktop', { title, body }),

  onNewTaskShortcut: (cb) => on('shortcut:new-task', cb),
  onFocusSearchShortcut: (cb) => on('shortcut:focus-search', cb),
  onPomodoroShortcut: (cb) => on('shortcut:pomodoro', cb),
})
