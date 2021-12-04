exports.handler = async (input, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      result: 'stopping'
    }),
    isBase64Encoded: false,
  }
}