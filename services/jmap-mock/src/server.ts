import fastify from 'fastify'

const server = fastify({
  logger: true
})

server.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'jmap-mock' }
})

server.get('/', async (request, reply) => {
  return { message: 'Ceerion JMAP Mock Service' }
})

server.post('/jmap', async (request, reply) => {
  return { 
    methodResponses: [],
    sessionState: 'mock-session'
  }
})

const start = async () => {
  try {
    await server.listen({ port: 8090, host: '0.0.0.0' })
    console.log(`JMAP mock server running on http://0.0.0.0:8090`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
