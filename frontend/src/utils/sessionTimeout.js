const TIMEOUT_MS = 15 * 60 * 1000  // 15 minutes

let timer = null

function resetTimer() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    localStorage.clear()
    window.location.href = "/login"
  }, TIMEOUT_MS)
}

export function startSessionTimeout() {
  ["mousemove", "mousedown", "keypress", "touchstart", "scroll"].forEach(event => {
    window.addEventListener(event, resetTimer, true)
  })
  resetTimer()
}

export function stopSessionTimeout() {
  clearTimeout(timer)
  ;["mousemove", "mousedown", "keypress", "touchstart", "scroll"].forEach(event => {
    window.removeEventListener(event, resetTimer, true)
  })
}
