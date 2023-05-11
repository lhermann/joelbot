import 'dotenv/config'
import { PineconeClient } from '@pinecone-database/pinecone'
import { Configuration, OpenAIApi } from 'openai'
import Papa from 'papaparse'
import fs from 'fs/promises'
import { dirname, basename, join } from 'path'
import { fileURLToPath } from 'url'
import _ from 'lodash'

// guid: https://docs.pinecone.io/docs/gen-qa-openai

const WINDOW = 6
const STRIDE = 2
const OPENAI_BATCH_SIZE = 50
const OPENAI_BATCH_LIMIT = 500
const OPENAI_BATCH_OFFSET = 0

const __dirname = dirname(fileURLToPath(import.meta.url))
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
const pinecone = new PineconeClient()
const pineconePromise = pinecone.init({
  environment: process.env.PINECONE_ENVIRONMENT,
  apiKey: process.env.PINECONE_API_KEY,
})

const docs = [
  {
    filename: join(__dirname, '../text/6829-kramp-dbj-buch-joel-1-die-ernte-ist-verloren-128.csv'),
    postId: '6829',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-1-die-ernte-ist-verloren/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 1. Die Ernte ist verloren',
    published: '2018-04-24T12:45:50+02:00',
  },
  {
    filename: join(__dirname, '../text/6882-kramp-dbj-buch-joel-2-stosst-in-das-horn-128.csv'),
    postId: '6882',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-2-stosst-in-das-horn/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 2. Stoßt in das Horn',
    published: '2018-05-20T12:01:45+02:00',
  },
  {
    filename: join(__dirname, '../text/6909-kramp-dbj-buch-joel-3-fruehregen-und-spaetregen-128.csv'),
    postId: '6909',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-3-fruehregen-und-spaetregen/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 3. Frühregen und Spätregen',
    published: '2018-05-30T00:29:53+02:00',
  },
  {
    filename: join(__dirname, '../text/7059-kramp-dbj-buch-joel-4-auf-dem-berg-zion-128.csv'),
    postId: '7059',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-4-auf-dem-berg-zion/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 4. Auf dem Berg Zion',
    published: '2018-08-23T14:19:00+02:00',
  },
  {
    filename: join(__dirname, '../text/7055-kramp-dbj-buch-joel-5-ins-tal-josaphat-128.csv'),
    postId: '7055',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-5-ins-tal-josaphat/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 5. Ins Tal Josaphat',
    published: '2018-08-23T14:25:09+02:00',
  },
  {
    filename: join(__dirname, '../text/7245-kramp-dbj-buch-joel-6-legt-die-sichel-an-128.csv'),
    postId: '7245',
    url: 'https://www.joelmedia.de/aufnahmen/das-buch-joel-6-legt-die-sichel-an/',
    speaker: 'Christopher Kramp',
    title: 'Das Buch Joel: 6. Legt die Sichel an',
    published: '2018-12-12T00:40:57+01:00',
  },
]

createEmbeddings(docs[0])

async function createEmbeddings ({
  filename,
  postId,
  url,
  speaker,
  title,
  published,
}) {
  await pineconePromise
  const pineconeIndex = pinecone.Index('joelbot-dev')

  // load audio transcript CSV file
  const file = await fs.readFile(filename, 'utf8')
  const { data: rawData } = await new Promise(resolve => Papa.parse(file, {
    complete: (results) => resolve(results),
  }))
  const formattedData = formatRawData(rawData, { postId, url, speaker, title, published })
  const balancedData = balanceLines(formattedData)
  const records = prepareRecords(balancedData, WINDOW, STRIDE)
  console.info(`RECORDS IN FILE = ${records.length}`)
  console.info(`OPENAI_BATCH_SIZE=${OPENAI_BATCH_SIZE}`)
  console.info(`OPENAI_BATCH_LIMIT=${OPENAI_BATCH_LIMIT}`)
  console.info(`OPENAI_BATCH_OFFSET=${OPENAI_BATCH_OFFSET}`)

  // Process in batches
  const limit = Math.min(records.length, OPENAI_BATCH_OFFSET + OPENAI_BATCH_LIMIT)
  let vectors = []
  for (let i = OPENAI_BATCH_OFFSET; i < limit; i += OPENAI_BATCH_SIZE) {
    const batch = records.slice(i, i + OPENAI_BATCH_SIZE)

    // generate vectors with openai
    try {
      const response = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: batch.map(record => record.transcript),
      })
      vectors = response.data.data
    } catch (error) {
      console.error(error?.response?.data, error?.response, error)
      console.info(`OPENAI_BATCH_SIZE=${OPENAI_BATCH_SIZE}`)
      console.info(`OPENAI_BATCH_LIMIT=${OPENAI_BATCH_LIMIT}`)
      console.info(`OPENAI_BATCH_OFFSET=${OPENAI_BATCH_OFFSET}`)
      console.info(`CURRENT OFFSET = ${i}`)
      // console.info(batch)
      process.exit(1)
    }

    // insert new vectors to pinecone index
    const payload = {
      upsertRequest: {
        vectors: batch.map((record, index) =>({
          id: record.id,
          values: vectors[index].embedding,
          metadata: _.omit(record, ['id']),
        }))
      },
    }
    await pineconeIndex.upsert(payload)

    // // Only update metadata of existing records
    // for (const record of batch) {
    //   await pineconeIndex.update({
    //     updateRequest: {
    //       id: record.id,
    //       setMetadata: _.omit(record, ['id']),
    //     },
    //   })
    // }

    console.info(`[SUCCESS] ${batch.length} vectors uploaded`)
    batch.forEach(record => console.info(`[RECORD] ${record.id}`))
    console.info(`OPENAI_BATCH_SIZE=${OPENAI_BATCH_SIZE}`)
    console.info(`OPENAI_BATCH_LIMIT=${OPENAI_BATCH_LIMIT}`)
    console.info(`OPENAI_BATCH_OFFSET=${OPENAI_BATCH_OFFSET}`)
    console.info(`PROCESSED IN BATCH = ${batch.length}`)
    console.info(`CURRENT OFFSET = ${i + batch.length}`)
    await new Promise(r => setTimeout(r, 2000))
  }
}

function formatRawData (data, metadata = {}) {
  const headers = ['startTime', 'endTime', 'language', 'confidence', 'channel', 'speakerTag', 'transcript']
  return _.drop(data)
    .map(row => ({
      ..._.omit(_.zipObject(headers, row), ['endTime', 'channel', 'speakerTag']),
      ...metadata,
    }))
    .filter(row => row.transcript)
}

/**
 * Return exactly one sentence per line
 */
function balanceLines (data) {
  let output = []
  let current = data[0]
  current.transcript = ''

  data.forEach((line) => {
    const sentences = line.transcript.split(/(?<=[.!?])\s+/)

    sentences.forEach((sentence, i) => {
      const text = (current.transcript + ' ' + sentence).trim()

      // if it ends with .?! and is not just one word, then push current and reset
      if (/[.!?]$/.test(text) && text.split(' ').length >= 1) {
        output.push({ ...current, transcript: text })
        current = line
        current.transcript = ''
      } else {
        current.transcript = text
      }
    })
  })

  return output
}

/**
 * Returns records taking 'window' and 'stride' into account
 */
function prepareRecords (data, window = 4, stride = 2) {
  let j = 0
  const records = []
  for (let i = 0; i < data.length; i += stride) {
    const transcript = data.slice(i, i + window).map(row => row.transcript.trim()).join(' ')
    const id = basename(data[i].url) + '-' + j
    records.push({ id, ...data[i], transcript })
    j++
  }
  return records
}

function extractFirstSentence (text) {
  const sentenceEnders = ['.', '?', '!']
  for (let i = 0; i < text.length; i++) {
    if (sentenceEnders.includes(text[i])) {
      return text.substring(0, i + 1).trim()
    }
  }
  return text
}
