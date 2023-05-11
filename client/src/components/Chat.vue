<template>
  <div id="chat">
    <div
      v-for="(message, i) in messages"
      :key="`message-${i}`"
      class="rounded-xl shadow-lg px-5 py-3 mb-4"
      :class="{
        'mr-12 bg-indigo-700 text-indigo-400': message.role === 'user',
        'ml-12 bg-purple-700 text-purple-400': message.role === 'assistant',
      }"
    >
      <p class="font-semibold">{{ message.role === 'user' ? 'Du' : 'JoelBot' }}</p>
      <p class="text-white">{{ message.content }}</p>
      <template v-if="message.metadata?.length">
        <p v-for="meta in message.metadata" :key="meta.id" >
          <a
            :href="meta.url"
            rel="noopener"
            class="hover:underline"
          >[&ldquo;{{ meta.title }}&rdquo; {{ toTimestamp(meta.startTime) }}]</a>
        </p>
      </template>
    </div>
    <div
      v-if="error"
      class="rounded-xl bg-red-700 text-red-200 shadow-lg px-5 py-3 mb-4"
    >
      {{ error }}
    </div>
    <div v-if="loading" class="p-3">
      <Spinner color="purple" class="ml-auto" />
    </div>
    <div class="relative">
      <input
        v-model="question"
        class="rounded-full h-12 w-full shadow-lg text-lg text-gray-800 pl-6 pr-32"
        :class="{ 'ring ring-red-500': !valid }"
        type="text"
        placeholder="Stelle mir eine Frage ..."
      >
      <button
        class="absolute right-1 top-1 bottom-1 rounded-full px-4"
        :class="{
          'bg-indigo-600 hover:bg-indigo-800': !loading,
          'bg-indigo-300 text-indigo-600': loading,
        }"
        :disabled="loading"
        @click="submitQuestion"
      >
        {{ loading ? 'Moment...' : 'Absenden' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import Spinner from './Spinner.vue'
import axios from 'axios'
import { ref } from 'vue'

const error = ref(null)
const loading = ref(false)
const valid = ref(true)
const question = ref('')
const messages = ref([])

async function submitQuestion () {
  valid.value = question.value.length > 6
  if (!valid.value) return

  error.value = null
  loading.value = true

  messages.value.push({
    role: 'user',
    content: question.value,
  })

  try {
    const { data } = await axios.post('https://europe-west1-joelbot-alpha.cloudfunctions.net/createAnswer', { question: question.value, mock: false })
    console.log('axios', data)
    const metadata = data.vectors.map(vector => ({
      id: vector.id,
      title: vector.metadata.title,
      url: vector.metadata.url,
      startTime: vector.metadata.startTime,
    }))
    messages.value.push({
      ...data.message,
      metadata,
    })
  } catch (err) {
    error.value = err
  } finally {
    question.value = ''
    loading.value = false
  }
}

function toTimestamp (seconds) {
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (hours) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Mock payload
// [
//   {
//     role: 'user',
//     content: 'Sunt in culpa qui officia deserunt mollit anim id est laborum?',
//   },
//   {
//     role: 'assistant',
//     content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
//     metadata: [
//       {
//         id: 1,
//         title: 'Das Buch Joel: 6. Legt die Sichel an',
//         url: 'https:/www.joelmedia.de/aufnahmen/das-buch-joel-6-legt-die-sichel-an/',
//         startTime: 341.400,
//       },
//       {
//         id: 2,
//         title: 'Das Buch Joel: 6. Legt die Sichel an',
//         url: 'https:/www.joelmedia.de/aufnahmen/das-buch-joel-6-legt-die-sichel-an/',
//         startTime: 341.400,
//       },
//     ],
//   },
// ]

</script>
