import 'dotenv/config'
import { PineconeClient } from '@pinecone-database/pinecone'
import { Configuration, OpenAIApi } from 'openai'
import _ from 'lodash'

// guid: https://docs.pinecone.io/docs/gen-qa-openai

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
const pinecone = new PineconeClient()
const pineconePromise = pinecone.init({
  environment: process.env.PINECONE_ENVIRONMENT,
  apiKey: process.env.PINECONE_API_KEY,
})

// createAnswer('Was hat das Volk im Buch Joel falsch gemacht, dass es zur Herzensumkehr aufgerufen wird?')
// createAnswer('Was ist denn der Frühregen von dem im Buch Joel gesprochen wird?')
createAnswer('Was ist denn der Spätregen von dem im Buch Joel gesprochen wird?')
// createAnswer('Sag mir welche Botschaft am wichtigsten ist?')
// createAnswer('Was bedeuten die Übriggebliebenen?')
// createAnswer('Was ist am 11. September 2001 passiert?')
async function createAnswer (question) {
  await pineconePromise
  const pineconeIndex = pinecone.Index('joelbot-dev')
  let vector = null

  // generate vectors with openai
  try {
    const { data } = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: question,
    })
    console.log('[openai.createEmbedding]', data)
    vector = data.data[0].embedding
  } catch (error) {
    console.error(error?.response?.data, error?.response, error)
    process.exit(1)
  }


  // query pinecone by vector
  const { matches } = await pineconeIndex.query({
    queryRequest: {
      topK: 3,
      includeMetadata: true,
      vector,
    },
  })
  console.log('[pinecone.query]', matches)

  let prompt = `Beantworte die Frage mit dem folgenden Kontext aus Video-Transkripten.

Kontext:
> ${matches[0].metadata.transcript} [Titel: ${matches[0].metadata.title}]

> ${matches[1].metadata.transcript} [Titel: ${matches[1].metadata.title}]

> ${matches[2].metadata.transcript} [Titel: ${matches[2].metadata.title}]

Frage: ${question}

Antwort:`

  let answer = null
  try {
    console.info('[prompt]', prompt)
    const { data: completion } = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{role: 'user', content: prompt}],
      max_tokens: 200,
    })
    answer = completion.choices[0].message
    console.info('[openai.createChatCompletion]', completion)
  } catch (error) {
    console.error(error?.response?.data, error?.response, error)
    process.exit(1)
  }

  console.info('\n\nOutput:\n')
  console.info(answer)
}
