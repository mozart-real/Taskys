let audioCtx = null

function ctx() {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function beep(freq, time, duration = 0.15) {
  const c = ctx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(c.destination)
  const t = c.currentTime + time
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.4, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

export function playAlarmOnce() {
  beep(880, 0)
  beep(660, 0.2)
  beep(880, 0.4)
}

export function createAlarmLoop() {
  let stopped = false
  let timeoutId = null

  function loop() {
    if (stopped) return
    beep(880, 0)
    beep(660, 0.22)
    beep(880, 0.44)
    beep(660, 0.66)
    timeoutId = setTimeout(loop, 2000)
  }
  loop()

  return {
    stop() {
      stopped = true
      clearTimeout(timeoutId)
    },
  }
}
