import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import mailRoutes from './routes/mail.js'
import policyRoutes from './routes/policy.js'

// Import utilities
import { initializeDatabase } from './db/index.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string }
    user: { userId: string; email: string }
  }
}

const server: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
})

// Register plugins
async function registerPlugins() {
  // Security
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:']
      }
    }
  })

  // CORS - restrict to ceerion.com and mail.ceerion.com
  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true) // Allow same-origin requests
      
      const allowedOrigins = [
        'https://ceerion.com',
        'https://mail.ceerion.com',
        'http://localhost:3000', // Development
        'http://localhost:5173'  // Vite dev server
      ]
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true
  })

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    skipOnError: false
  })

  // JWT
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
  })

  // WebSocket for JMAP mock integration
  await server.register(websocket)
}

// Authentication hook
server.decorate('authenticate', async function(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Health check
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Register routes
async function registerRoutes() {
  await server.register(authRoutes, { prefix: '/auth' })
  await server.register(userRoutes, { prefix: '/users' })
  await server.register(mailRoutes, { prefix: '/mail' })
  await server.register(policyRoutes, { prefix: '/policy' })
}

// WebSocket endpoint for JMAP mock communication
server.register(async function (fastify) {
  fastify.get('/ws/jmap', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        fastify.log.info('JMAP WebSocket message:', data)
        
        // Echo back for now - will integrate with actual JMAP mock
        connection.socket.send(JSON.stringify({
          type: 'response',
          requestId: data.requestId,
          data: { status: 'received' }
        }))
      } catch (error) {
        fastify.log.error('WebSocket message error:', error)
      }
    })
    
    connection.socket.on('close', () => {
      fastify.log.info('JMAP WebSocket connection closed')
    })
  })
})

// Error handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error)
  
  if (error.validation) {
    reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    })
  } else if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.name,
      message: error.message
    })
  } else {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    })
  }
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully`)
  try {
    await server.close()
    process.exit(0)
  } catch (error) {
    server.log.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const start = async () => {
  try {
    // Initialize database
    await initializeDatabase()
    
    // Register plugins and routes
    await registerPlugins()
    await registerRoutes()
    
    // Start listening
    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'
    
    await server.listen({ port, host })
    server.log.info(`🚀 Email Backend Server running at http://${host}:${port}`)
    server.log.info(`📧 Single-domain lock: ceerion.com`)
    server.log.info(`🔐 JWT Authentication enabled`)
    server.log.info(`🌐 WebSocket endpoint: ws://${host}:${port}/ws/jmap`)
    
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

export default server

// Start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}
