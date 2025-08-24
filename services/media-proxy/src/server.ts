import fastify from 'fastify'
import cors from '@fastify/cors'
import { URL } from 'url'

const server = fastify({
  logger: true
})

// Register CORS
server.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
  credentials: true
})

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const TIMEOUT_MS = 10000 // 10 seconds

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
]

// Strip tracking parameters
function stripTrackingParams(url: string): string {
  const urlObj = new URL(url)
  
  // Common tracking parameters to remove
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'fbclid', 'mc_eid', 'mc_cid', '_ga', '_gl',
    'msclkid', 'twclid', 'li_fat_id', 'igshid'
  ]
  
  trackingParams.forEach(param => {
    urlObj.searchParams.delete(param)
  })
  
  return urlObj.toString()
}

server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    service: 'media-proxy',
    maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    timeout: `${TIMEOUT_MS}ms`
  }
})

server.get('/', async (request, reply) => {
  return { message: 'Ceerion Media Proxy Service', version: '1.0.0' }
})

server.get('/proxy', async (request, reply) => {
  const query = request.query as any
  const targetUrl = query.url
  
  if (!targetUrl) {
    return reply.code(400).send({ error: 'Missing url parameter' })
  }
  
  try {
    // Validate URL
    const parsedUrl = new URL(targetUrl)
    
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return reply.code(400).send({ error: 'Only HTTP/HTTPS URLs are allowed' })
    }
    
    // Strip tracking parameters
    const cleanUrl = stripTrackingParams(targetUrl)
    
    server.log.info(`Media Proxy: Fetching ${cleanUrl}`)
    
    // Fetch the image with timeout and size limit
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    
    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Ceerion-Media-Proxy/1.0',
        'Accept': 'image/*',
        'Cache-Control': 'max-age=3600'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return reply.code(response.status).send({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      })
    }
    
    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    
    // Validate content type
    if (!contentType || !ALLOWED_IMAGE_TYPES.some(type => contentType.startsWith(type))) {
      return reply.code(400).send({ error: 'URL does not point to a supported image type' })
    }
    
    // Check content length
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return reply.code(413).send({ error: `Image too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` })
    }
    
    // Stream the response with size checking
    const reader = response.body?.getReader()
    if (!reader) {
      return reply.code(500).send({ error: 'Failed to read image data' })
    }
    
    let totalSize = 0
    const chunks: Uint8Array[] = []
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        if (value) {
          totalSize += value.length
          if (totalSize > MAX_FILE_SIZE) {
            return reply.code(413).send({ error: `Image too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` })
          }
          chunks.push(value)
        }
      }
    } finally {
      reader.releaseLock()
    }
    
    // Combine chunks
    const imageBuffer = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      imageBuffer.set(chunk, offset)
      offset += chunk.length
    }
    
    // Set safe headers
    reply.headers({
      'Content-Type': contentType,
      'Content-Length': totalSize.toString(),
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'",
      'Referrer-Policy': 'no-referrer'
    })
    
    server.log.info(`Media Proxy: Served ${totalSize} bytes for ${cleanUrl}`)
    
    return reply.send(Buffer.from(imageBuffer))
    
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return reply.code(400).send({ error: 'Invalid URL format' })
    }
    
    if (error?.name === 'AbortError') {
      return reply.code(408).send({ error: 'Request timeout' })
    }
    
    server.log.error('Media Proxy error:', error)
    return reply.code(500).send({ error: 'Failed to proxy image' })
  }
})

const start = async () => {
  try {
    await server.listen({ port: 8091, host: '0.0.0.0' })
    server.log.info('🚀 Media Proxy Server running at http://0.0.0.0:8091')
    server.log.info(`🖼️  Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    server.log.info(`⏱️  Request timeout: ${TIMEOUT_MS}ms`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
