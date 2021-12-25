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

  let buttonText = `Turn ${buttonAction}`
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
  setPage({status: "Starting...", buttonAction: "refresh"})
  setTimeout(getServerStatus, 60*1000) // Check after 1, 2, 3 min
  setTimeout(getServerStatus, 2*60*1000)
  setTimeout(getServerStatus, 3*60*1000)
}
const serverStopping = () => {
  setPage({status: "Stopping...", buttonAction: "refresh"})
  setTimeout(getServerStatus, 60*1000) // Check after 1, 2, 3 min
  setTimeout(getServerStatus, 2*60*1000)
  setTimeout(getServerStatus, 3*60*1000)
}
const serverOn = () => {
  setPage({status: "On", buttonAction: "Off"})
}
const serverOff = () => {
  setPage({status: "Off", buttonAction: "On"})
}

async function startServer() {
  const Authorization = document.getElementById(passwordId)
  const response = await fetch(apiGatewayUrl + start, {method: 'POST', headers: {Authorization}})
  console.log(response)
  // Fixme: should be smarter
  if (response == 200) {
    serverStarting()
  }
}

async function stopServer() {
  const Authorization = document.getElementById(passwordId)
  const response = await fetch(apiGatewayUrl + stop, {method: 'POST', headers: {Authorization}})
  // Fixme: should be smarter
  if (response == 200) {
    serverStopping()
  }
}