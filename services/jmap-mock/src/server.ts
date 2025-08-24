import fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'

interface Message {
  id: string
  threadId: string
  subject: string
  snippet: string
  from: { email: string; name: string }
  to: Array<{ email: string; name?: string }>
  receivedAt: string
  isUnread: boolean
  labelIds: string[]
  sizeEstimate: number
}

const server = fastify({
  logger: true
})

// Mock message data
const mockMessages: Message[] = [
  {
    id: 'msg_001',
    threadId: 'thread_001',
    subject: 'Welcome to Ceerion Mail',
    snippet: 'Thank you for joining Ceerion Mail. This is your first message...',
    from: { email: 'welcome@ceerion.com', name: 'Ceerion Team' },
    to: [{ email: 'user@ceerion.com', name: 'Test User' }],
    receivedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    isUnread: true,
    labelIds: ['INBOX'],
    sizeEstimate: 1024
  },
  {
    id: 'msg_002', 
    threadId: 'thread_002',
    subject: 'Security Alert: New Login',
    snippet: 'We detected a new login to your account from a new device...',
    from: { email: 'security@ceerion.com', name: 'Ceerion Security' },
    to: [{ email: 'user@ceerion.com', name: 'Test User' }],
    receivedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    isUnread: false,
    labelIds: ['INBOX', 'IMPORTANT'],
    sizeEstimate: 756
  },
  {
    id: 'msg_003',
    threadId: 'thread_003', 
    subject: 'Weekly Report: Email Analytics',
    snippet: 'Here is your weekly email analytics report...',
    from: { email: 'analytics@ceerion.com', name: 'Ceerion Analytics' },
    to: [{ email: 'user@ceerion.com', name: 'Test User' }],
    receivedAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    isUnread: true,
    labelIds: ['INBOX'],
    sizeEstimate: 2048
  }
]

// Store connected WebSocket clients
const connectedClients = new Set<any>()

// Register plugins
async function registerPlugins() {
  await server.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
    credentials: true
  })
  
  await server.register(websocket)
}

// WebSocket endpoint for push notifications
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection: any, req: any) => {
    connectedClients.add(connection)
    
    fastify.log.info('JMAP Mock: Client connected via WebSocket')
    
    connection.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString())
        fastify.log.info('JMAP Mock: Received WebSocket message', data)
        
        // Echo back acknowledgment
        connection.send(JSON.stringify({
          type: 'ack',
          requestId: data.requestId,
          timestamp: new Date().toISOString()
        }))
      } catch (error: any) {
        fastify.log.error('JMAP Mock: WebSocket message error', error)
      }
    })
    
    connection.on('close', () => {
      connectedClients.delete(connection)
      fastify.log.info('JMAP Mock: Client disconnected')
    })
  })
})

// Broadcast to all connected clients
function broadcastToClients(data: any) {
  const message = JSON.stringify(data)
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket OPEN state
      client.send(message)
    }
  })
}

server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    service: 'jmap-mock',
    connectedClients: connectedClients.size,
    messages: mockMessages.length
  }
})

server.get('/', async (request, reply) => {
  return { message: 'Ceerion JMAP Mock Service', version: '1.0.0' }
})

// GET /messages - List messages
server.get('/messages', async (request, reply) => {
  const query = request.query as any
  const maxResults = Math.min(parseInt(query.maxResults || '50'), 50)
  const pageToken = query.pageToken || '0'
  const labelIds = query.labelIds ? (Array.isArray(query.labelIds) ? query.labelIds : [query.labelIds]) : []
  
  let filteredMessages = [...mockMessages]
  
  // Filter by labels if specified
  if (labelIds.length > 0) {
    filteredMessages = filteredMessages.filter(msg => 
      labelIds.some((labelId: string) => msg.labelIds.includes(labelId))
    )
  }
  
  // Simple pagination
  const startIndex = parseInt(pageToken)
  const endIndex = startIndex + maxResults
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex)
  
  const response = {
    messages: paginatedMessages,
    resultSizeEstimate: filteredMessages.length,
    nextPageToken: endIndex < filteredMessages.length ? endIndex.toString() : undefined
  }
  
  server.log.info(`JMAP Mock: Returning ${paginatedMessages.length} messages`)
  return response
})

// GET /messages/:id - Get specific message
server.get('/messages/:id', async (request, reply) => {
  const params = request.params as any
  const messageId = params.id
  
  const message = mockMessages.find(msg => msg.id === messageId)
  if (!message) {
    return reply.code(404).send({ error: 'Message not found' })
  }
  
  // Return full message with body
  const fullMessage = {
    ...message,
    payload: {
      headers: [
        { name: 'From', value: `${message.from.name} <${message.from.email}>` },
        { name: 'To', value: message.to.map(t => `${t.name || ''} <${t.email}>`).join(', ') },
        { name: 'Subject', value: message.subject },
        { name: 'Date', value: message.receivedAt }
      ],
      body: {
        data: Buffer.from(`
          <html>
            <body>
              <h2>${message.subject}</h2>
              <p>${message.snippet}</p>
              <p>This is a mock email message for testing purposes.</p>
              <img src="https://via.placeholder.com/150" alt="Test image" />
            </body>
          </html>
        `).toString('base64')
      }
    }
  }
  
  return fullMessage
})

// POST /send - Send message and trigger WebSocket notification
server.post('/send', async (request, reply) => {
  const body = request.body as any
  
  server.log.info('JMAP Mock: Sending email', body)
  
  // Create a new message ID for the sent message
  const sentMessageId = `msg_sent_${Date.now()}`
  const newMessage: Message = {
    id: sentMessageId,
    threadId: `thread_sent_${Date.now()}`,
    subject: body.subject || 'No Subject',
    snippet: (body.body || body.htmlBody || '').substring(0, 100),
    from: { email: body.from || 'user@ceerion.com', name: 'User' },
    to: (body.to || []).map((email: string) => ({ email })),
    receivedAt: new Date().toISOString(),
    isUnread: false,
    labelIds: ['SENT'],
    sizeEstimate: JSON.stringify(body).length
  }
  
  // Add to mock messages (sent folder)
  mockMessages.unshift(newMessage)
  
  // Broadcast new mail notification via WebSocket
  broadcastToClients({
    type: 'newMail',
    message: newMessage,
    timestamp: new Date().toISOString()
  })
  
  server.log.info(`JMAP Mock: Sent message ${sentMessageId}, notified ${connectedClients.size} clients`)
  
  return {
    success: true,
    messageId: sentMessageId,
    timestamp: new Date().toISOString()
  }
})

// JMAP protocol endpoint
server.post('/jmap', async (request, reply) => {
  return { 
    methodResponses: [],
    sessionState: 'mock-session'
  }
})

const start = async () => {
  try {
    await registerPlugins()
    
    await server.listen({ port: 8092, host: '0.0.0.0' })
    server.log.info('🚀 JMAP Mock Server running at http://0.0.0.0:8092')
    server.log.info(`📧 Mock messages loaded: ${mockMessages.length}`)
    server.log.info('🌐 WebSocket endpoint: ws://0.0.0.0:8092/ws')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
