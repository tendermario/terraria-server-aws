const apiGatewayUrl = 'https://ibrrh55jbl.execute-api.us-west-2.amazonaws.com/'

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
function fn() {
  const currentState = document.getElementById(currentStateId)
  const changeStateButton = document.getElementById(changeStateButtonId)

  fetch(apiGatewayUrl + getStatus)
    .then(response => {
      const {result} = response.json().body
      const status = result == "running" ? "On" : "Off"
      const notStatus = result == "running" ? "Off" : "On"
      // Make sure we're not replacing with garbage data...
      if (result) {
        currentState.textContent(`Status: ${status}`)
        changeStateButton.textContent(`Turn: ${notStatus}`)
      }
    })
    .catch(err => {
      console.error(`Some error ${err}`)
    })
}
