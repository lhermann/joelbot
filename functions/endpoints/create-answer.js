const { onRequest } = require('firebase-functions/v2/https')
const AiService = require('../services/AiService.js')

const options = {
  cors: process.env.CORS,
  region: 'europe-west1',
}

exports.createAnswer = onRequest(options, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).send('OK')
  if (req.method !== 'POST') return res.status(403).send(`${req.method} forbidden!`)

  const { question } = req.body
  await AiService.init()
  const answer = await AiService.createAnswer(question)
  return res.json(answer)
})

exports.createAnswerMock = onRequest(options, async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).send('OK')
  if (req.method !== 'POST') return res.status(403).send(`${req.method} forbidden!`)

  return res.json({
    role: 'assistant',
    content: 'Der Sp\u00e4tregen, von dem im Buch Joel gesprochen wird, ist ein Bild f\u00fcr die Ausgie\u00dfung des Heiligen Geistes, die zum Ende der Zeit stattfinden wird und zur Wiederherstellung der Ernte f\u00fchren wird. Es wird betont, dass das gemeinsame Gebet eine wichtige Rolle bei der Ausgie\u00dfung des Heiligen Geistes spielt und dass das treue Volk Gottes Anteil an dieser Herrlichkeit haben wird.',
  })
})
