const apiGatewayUrl = 'https://ky331xbqw4.execute-api.us-west-2.amazonaws.com/prod/'

const getStatus = 'status'
const start = 'start'
const stop = 'stop'

const currentStateId = 'current-state'
const changeStateButtonId = 'change-state'
const passwordId = 'password'

const stateOn = "running"
const stateStarting = "pending"
const stateOff = "stopped"

// On load...
if (document.readyState != 'loading'){
  fn()
} else {
  document.addEventListener('DOMContentLoaded', fn)
}

// ...Do this
async function fn() { loadPageWithCurrentStatus() }

async function loadPageWithCurrentStatus() {
  const currentState = document.getElementById(currentStateId)
  const changeStateButton = document.getElementById(changeStateButtonId)

  const response = await fetch(apiGatewayUrl + getStatus)
  const {result} = await response.json()
  const status = result == stateOn ? "On" : "Off"
  const notStatus = result == stateOn ? "Off" : "On"
  // Make sure we're not replacing with garbage data...
  if (result) {
    currentState.textContent = `Status: ${status}`
    changeStateButton.textContent = `Turn ${notStatus}`
    document.title = `Terraria server - ${status}`
  }
}

async function startServer() {
  const Authorization = document.getElementById(passwordId)
  fetch(apiGatewayUrl + start, {method: 'POST', headers: {Authorization}})
}

async function stopServer() {
  // Get the value from a text box for the password
  const Authorization = document.getElementById(passwordId)
  fetch(apiGatewayUrl + stop, {method: 'POST', headers: {Authorization}})
}
