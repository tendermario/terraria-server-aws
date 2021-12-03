exports.handler = async (input, context) => {
  return {
    statusCode: 200,
    headers: {},
    body: JSON.stringify({
      result: 'starting'
    }),
    isBase64Encoded: false,
  }
}