const { contextBridge, ipcRenderer } = require('electron')

function on(channel, cb) {
  ipcRenderer.removeAllListeners(channel)
  ipcRenderer.on(channel, (_e, ...args) => cb(...args))
}

contextBridge.exposeInMainWorld('reminder', {
  getTask: () => ipcRenderer.invoke('reminder:get-current'),
  show: (cb) => on('reminder:show', cb),
  update: (cb) => on('reminder:update', cb),
  snooze: (id, minutes) => ipcRenderer.invoke('reminder:snooze', { id, minutes }),
  done: (id) => ipcRenderer.invoke('reminder:done', id),
  dismiss: () => ipcRenderer.invoke('reminder:dismiss'),
  alarmPlay: (cb) => ipcRenderer.on('alarm:play', cb),
})
