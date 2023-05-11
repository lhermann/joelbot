const functions = require('firebase-functions')
const handleCors = require('./handleCors.js')
const AiService = require('../services/AiService.js')

const mockPayload = {
  vectors: [
    {
      'id': 'das-buch-joel-6-legt-die-sichel-an-8',
      'score': 0.882065356,
      'values': [],
      'metadata': {
        'confidence': '0.91040',
        'language': 'de-de',
        'postId': '7245',
        'published': '2018-12-12T00:40:57+01:00',
        'speaker': 'Christopher Kramp',
        'startTime': '341.400',
        'title': 'Das Buch Joel: 6. Legt die Sichel an',
        'transcript': '...',
        'url': 'https:/www.joelmedia.de/aufnahmen/das-buch-joel-6-legt-die-sichel-an/',
      },
    },
  ],
  message: {
    role: 'assistant',
    content: 'Der Sp\u00e4tregen, von dem im Buch Joel gesprochen wird, ist ein Bild f\u00fcr die Ausgie\u00dfung des Heiligen Geistes, die zum Ende der Zeit stattfinden wird und zur Wiederherstellung der Ernte f\u00fchren wird. Es wird betont, dass das gemeinsame Gebet eine wichtige Rolle bei der Ausgie\u00dfung des Heiligen Geistes spielt und dass das treue Volk Gottes Anteil an dieser Herrlichkeit haben wird.',
  },
}

exports.createAnswer = functions.region('europe-west1').https.onRequest(async (req, res) => {
  handleCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).send('OK')
  if (req.method !== 'POST') return res.status(403).send(`${req.method} forbidden!`)

  const { question, mock = false } = req.body
  if (mock) return res.json(mockPayload)

  await AiService.init()
  const { message, vectors } = await AiService.createAnswer(question)
  return res.json({ message, vectors })
})
