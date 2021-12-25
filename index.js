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

let currentState
let changeStateButton

// On load...
if (document.readyState != 'loading'){
  fn()
} else {
  document.addEventListener('DOMContentLoaded', fn)
}

// ...Do this
async function fn() {
  currentState = document.getElementById(currentStateId)
  changeStateButton = document.getElementById(changeStateButtonId)
  getServerStatus()
}

async function getServerStatus() {
  const response = await fetch(apiGatewayUrl + getStatus)
  const {result} = await response.json()

  result == stateOn && serverOn()
  result == stateOff && serverOff()
  result == stateStarting && serverStarting()
}

const setPage = ({status, buttonAction}) => {
  currentState.textContent = `Status: ${status}`
  document.title = `Terraria server - ${status}`

  const buttonText = `Turn ${buttonAction}`
  if (buttonAction == "refresh") {
    buttonText = "Refresh status"
  }
  changeStateButton.textContent = buttonText
  setButton(buttonAction)
}
const setButton = action => {
  switch (action) {
    case "On":
      changeStateButton.addEventListener("click", () => {
        startServer()
      })
      break;
    case "Off":
      changeStateButton.addEventListener("click", () => {
        stopServer()
      })
      break;
    case "refresh":
      changeStateButton.addEventListener("click", () => {
        getServerStatus()
      })
      break;
    default:
      console.log("No button action listed")
      break;
  }
}
const serverStarting = () => {
  setPage({status: "Starting", buttonAction: "refresh"})
}
const serverOn = () => {
  setPage({status: "On", buttonAction: "Off"})
}
const serverOff = () => {
  setPage({status: "Off", buttonAction: "On"})
}

async function startServer() {
  const Authorization = document.getElementById(passwordId)
  fetch(apiGatewayUrl + start, {method: 'POST', headers: {Authorization}})
  serverStarting()
}

async function stopServer() {
  const Authorization = document.getElementById(passwordId)
  fetch(apiGatewayUrl + stop, {method: 'POST', headers: {Authorization}})
  serverStarting() // Should be stopping instead of starting but meh, almost the same
}

async function refreshServerStatus() {
  const Authorization = document.getElementById(passwordId)
  fetch(apiGatewayUrl + stop, {method: 'POST', headers: {Authorization}})
}
