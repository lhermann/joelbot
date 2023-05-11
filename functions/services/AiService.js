const logger = require('firebase-functions/logger')
const { PineconeClient } = require('@pinecone-database/pinecone')
const { Configuration, OpenAIApi } = require('openai')

const $private = {
  openai: null,
  pinecone: null,
  pineconeIndex: null,
}

/**
 * AiService class
 */
module.exports = class AiService {
  /**
   * [init description]
   * @return {[type]} [description]
   */
  static async init () {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    $private.openai = new OpenAIApi(configuration)
    $private.pinecone = new PineconeClient()
    await $private.pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    })
    $private.pineconeIndex = $private.pinecone.Index('joelbot-dev')
  }

  /**
   * [createAnswer description]
   * @param  {[type]} question [description]
   * @return {[type]}          [description]
   */
  static async createAnswer (question) {
    let vector = null

    // generate vectors with openai
    try {
      const { data } = await $private.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: question,
      })
      logger.log('[openai.createEmbedding]', data)
      vector = data.data[0].embedding
    } catch (error) {
      logger.error(error?.response?.data, error?.response, error)
      process.exit(1)
    }


    // query pinecone by vector
    const { matches } = await $private.pineconeIndex.query({
      queryRequest: {
        topK: 3,
        includeMetadata: true,
        vector,
      },
    })
    logger.log('[pinecone.query]', matches)

    const prompt = `Beantworte die Frage mit dem folgenden Kontext aus Video-Transkripten.

Kontext:
> ${matches[0].metadata.transcript} [Titel: ${matches[0].metadata.title}]

> ${matches[1].metadata.transcript} [Titel: ${matches[1].metadata.title}]

> ${matches[2].metadata.transcript} [Titel: ${matches[2].metadata.title}]

Frage: ${question}

Antwort:`

    let answer = null
    try {
      logger.log('[prompt]', prompt)
      const { data: completion } = await $private.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      })
      answer = completion.choices[0].message
      logger.log('[openai.createChatCompletion]', completion)
    } catch (error) {
      logger.error(error?.response?.data, error?.response, error)
      process.exit(1)
    }

    logger.log('[output]', answer)

    return {
      message: answer,
      vectors: matches,
    }
  }
}
