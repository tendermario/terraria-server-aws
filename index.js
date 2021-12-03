const apiGatewayUrl = 'https://ibrrh55jbl.execute-api.us-west-2.amazonaws.com/'

const getStatus = 'status'

const currentStateId = 'current-state'
const changeStateButtonId = 'change-state'

// On load
function ready(fn) {
  if (document.readyState != 'loading'){
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}
// Do this
fn = () => {
  const currentState = document.getElementById(currentStateId)
  const changeStateButton = document.getElementById(changeStateButtonId)

  fetch(apiGatewayUrl + getStatus)
    .then(response => {
      const status = response.json()
      // Make sure we're not replacing with garbage data...
      const notStatus = status == "On" ? "Off" : "On" 
      if (status) {
        currentState.textContent(`Status: ${status}`)
        changeStateButton.textContent(`Turn: ${notStatus}`)
      }
    })
    .catch(err => {
      console.error(`Some error ${err}`)
    })
}
