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
      const status = response.json() // TODO: get the body or whatever
      const notStatus = status == "On" ? "Off" : "On"
      // Make sure we're not replacing with garbage data...
      if (status) {
        currentState.textContent(`Status: ${status}`)
        changeStateButton.textContent(`Turn: ${notStatus}`)
      }
    })
    .catch(err => {
      console.error(`Some error ${err}`)
    })
}
