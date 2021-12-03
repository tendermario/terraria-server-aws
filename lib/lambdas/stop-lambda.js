exports.handler = async (input, context) => {
  return {
    statusCode: 200,
    headers: {},
    body: JSON.stringify({
      result: 'stopping'
    }),
    isBase64Encoded: false,
  }
}