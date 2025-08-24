import fastify from 'fastify'

const DOMAIN = 'ceerion.com'
const HOST = 'mail.ceerion.com'

const server = fastify({
  logger: true
})

// Domain validation middleware
server.addHook('onRequest', async (request, reply) => {
  const host = request.headers.host
  if (host && !host.includes(HOST) && process.env.NODE_ENV === 'production') {
    reply.code(400).send({ error: `Invalid host. Expected ${HOST}` })
  }
})

server.get('/health', async (request, reply) => {
  return { status: 'ok', domain: DOMAIN, host: HOST }
})

server.get('/', async (request, reply) => {
  return { message: 'Ceerion Email Backend API', domain: DOMAIN }
})

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' })
    console.log(`Backend server running on http://0.0.0.0:3000`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
