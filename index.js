const apiGatewayUrl = 'https://ky331xbqw4.execute-api.us-west-2.amazonaws.com/prod/'

const getStatus = 'status'
const start = 'start'
const stop = 'stop'

const currentStateId = 'current-state'
const changeStateButtonId = 'change-state'
const passwordId = 'password'

const stateOn = "running"
const stateStarting = "pending"
const stateStopping = "stopping"
const stateOff = "stopped"

let currentState
let changeStateButton
let passwordField

let intervalCheck

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
  passwordField = document.getElementById(passwordId)
  getServerStatus()
}

async function getServerStatus() {
  const response = await fetch(apiGatewayUrl + getStatus)
  const {result} = await response.json()

  result == stateOn && serverOn()
  result == stateOff && serverOff()
  result == stateStarting && serverStarting()
  result == stateStopping && serverStopping()
}

const setPage = ({status, buttonAction}) => {
  currentState.textContent = `Status: ${status}`
  document.title = `Terraria server - ${status}`

  let buttonText = `Turn ${buttonAction}`
  if (buttonAction == "refresh") {
    buttonText = "Refresh status"
  }
  changeStateButton.textContent = buttonText
  setButton(buttonAction)
}
const setButton = action => {
  // Remove all event listeners to replace them with a new one:
  changeStateButton.removeEventListener("click", startServer)
  changeStateButton.removeEventListener("click", stopServer)
  changeStateButton.removeEventListener("click", getServerStatus)
  
  switch (action) {
    case "On":
      changeStateButton.addEventListener("click", startServer)
      break;
    case "Off":
      changeStateButton.addEventListener("click", stopServer)
      break;
    case "refresh":
      changeStateButton.addEventListener("click", getServerStatus)
      break;
    default:
      console.log("No button action listed")
      break;
  }
}

const checkStatus = action => {
  clearInterval(intervalCheck)
  // Check server status continuously for one minute, with 2 second intervals
  // Stops in about 18-40 seconds, starts in 6-20 seconds
  intervalCheck = setInterval(getServerStatus, 2*1000)
  setTimeout(() => clearInterval(intervalCheck), 60*1000)
}
const serverStarting = () => {
  setPage({status: "Starting...", buttonAction: "refresh"})
  checkStatus()
}
const serverStopping = () => {
  setPage({status: "Stopping...", buttonAction: "refresh"})
  checkStatus()
}
const serverOn = () => {
  setPage({status: "On", buttonAction: "Off"})
}
const serverOff = () => {
  setPage({status: "Off", buttonAction: "On"})
}

const passwordIncorrect = () => {
  passwordField.classList.add("bg-red-400")
}

const passwordCorrect = () => {
  passwordField.classList.remove("bg-red-400")
}

async function startServer() {
  const Authorization = passwordField.value
  try {
    const response = await fetch(apiGatewayUrl + start, {method: 'POST', headers: {Authorization}})
    if (response.ok) {
      passwordCorrect()
      serverStarting()
    }
  } catch (e) {
    passwordIncorrect()
  }
}

async function stopServer() {
  const Authorization = passwordField.value
  try {
    const response = await fetch(apiGatewayUrl + stop, {method: 'POST', headers: {Authorization}})
    if (response.ok) {
      passwordCorrect()
      serverStopping()
    }
  } catch (e) {
    passwordIncorrect()
  }
}