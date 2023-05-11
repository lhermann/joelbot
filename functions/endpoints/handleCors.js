module.exports = function handleCors (req, res, { headers = 'Content-Type' } = {}) {
  const allowedOrigins = process.env.CORS_ORIGINS.split(',')
  let origin = req.get('origin')
  if (!allowedOrigins.includes(origin)) origin = allowedOrigins[0]
  res.set('Access-Control-Allow-Origin', origin)
  res.set('Access-Control-Allow-Headers', headers)
}
