exports.handler = async (input, context) => {
  return {
    statusCode: 200,
    headers: {},
    body: JSON.stringify({
      result: 'running'
    }),
    isBase64Encoded: false,
  }
}