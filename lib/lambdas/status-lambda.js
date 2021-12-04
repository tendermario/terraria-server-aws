exports.handler = async (input, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      result: 'running'
    }),
    isBase64Encoded: false,
  }
}