import fastify from 'fastify'

const server = fastify({
  logger: true
})

server.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'media-proxy' }
})

server.get('/', async (request, reply) => {
  return { message: 'Ceerion Media Proxy Service' }
})

const start = async () => {
  try {
    await server.listen({ port: 8091, host: '0.0.0.0' })
    console.log(`Media proxy server running on http://0.0.0.0:8091`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
