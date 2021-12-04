const apiGatewayUrl = 'https://ky331xbqw4.execute-api.us-west-2.amazonaws.com/prod/'

const getStatus = 'status'

const currentStateId = 'current-state'
const changeStateButtonId = 'change-state'

// On load...
if (document.readyState != 'loading'){
  fn()
} else {
  document.addEventListener('DOMContentLoaded', fn)
}

// ...Do this
async function fn() {
  const currentState = document.getElementById(currentStateId)
  const changeStateButton = document.getElementById(changeStateButtonId)

  const response = await fetch(apiGatewayUrl1 + getStatus)
  const {result} = await response.json()
  const status = result == "running" ? "On" : "Off"
  const notStatus = result == "running" ? "Off" : "On"
  // Make sure we're not replacing with garbage data...
  if (result) {
    currentState.textContent = `Status: ${status}`
    changeStateButton.textContent = `Turn ${notStatus}`
    document.title = `Terraria server - ${status}`
  }
}
