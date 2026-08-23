// ---- download links served by the local Python server ----
const BASE = location.origin

document.querySelectorAll('[data-dl]').forEach((el) => {
  const file = el.dataset.dl
  if (file === 'AppImage') el.href = `${BASE}/download/appimage`
})

// ---- download counter ----
async function loadCounter() {
  const el = document.getElementById('dl-count')
  try {
    const res = await fetch('/api/downloads')
    const data = await res.json()
    animate(el, data.count)
  } catch {
    animate(el, 0)
  }
}

function animate(el, target) {
  const start = performance.now()
  const dur = 900
  function tick(now) {
    const t = Math.min((now - start) / dur, 1)
    el.textContent = Math.floor(target * (1 - Math.pow(1 - t, 3))).toLocaleString('en-US')
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

loadCounter()

function trackDownload(event) {
  const name = event.currentTarget.dataset.dl
  if (window.plausible) window.plausible('Download', { props: { file: name } })
}

// ---- copy command ----
function copyCmd(btn) {
  navigator.clipboard.writeText(document.getElementById('curl-cmd').textContent).then(() => {
    btn.textContent = 'Copied'
    setTimeout(() => (btn.textContent = 'Copy'), 1600)
  })
}

// ---- toast helper ----
const toast = document.createElement('div')
toast.className = 'toast'
document.body.appendChild(toast)
window.showToast = (msg) => {
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2000)
}
