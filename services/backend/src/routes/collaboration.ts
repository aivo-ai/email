import { FastifyInstance } from 'fastify'
import { CalDAVServiceImpl } from '../services/caldav.service.js'
import { CardDAVServiceImpl } from '../services/carddav.service.js'
import { Pool } from 'pg'

export async function collaborationRoutes(fastify: FastifyInstance) {
  const db = fastify.pg as Pool
  const caldavService = new CalDAVServiceImpl(db)
  const carddavService = new CardDAVServiceImpl(db)

  // Calendar Routes
  fastify.get('/calendars', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const calendars = await caldavService.getCalendars(userId)
      return { calendars }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch calendars' })
    }
  })

  fastify.get('/calendars/:calendarId/events', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { calendarId } = request.params as { calendarId: string }
    const { start, end } = request.query as { start?: string; end?: string }

    try {
      const events = await caldavService.listEvents(userId, calendarId, start, end)
      return { events }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch events' })
    }
  })

  fastify.get('/calendars/:calendarId/events/:eventId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { calendarId, eventId } = request.params as { calendarId: string; eventId: string }

    try {
      const event = await caldavService.getEvent(userId, calendarId, eventId)
      if (!event) {
        return reply.code(404).send({ error: 'Event not found' })
      }
      return { event }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch event' })
    }
  })

  fastify.post('/calendars/:calendarId/events', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { calendarId } = request.params as { calendarId: string }
    const eventData = request.body as any

    try {
      const event = await caldavService.createEvent(userId, calendarId, eventData)
      return reply.code(201).send({ event })
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create event' })
    }
  })

  fastify.put('/calendars/:calendarId/events/:eventId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { calendarId, eventId } = request.params as { calendarId: string; eventId: string }
    const updates = request.body as any

    try {
      const event = await caldavService.updateEvent(userId, calendarId, eventId, updates)
      return { event }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update event' })
    }
  })

  fastify.delete('/calendars/:calendarId/events/:eventId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { calendarId, eventId } = request.params as { calendarId: string; eventId: string }

    try {
      await caldavService.deleteEvent(userId, calendarId, eventId)
      return reply.code(204).send()
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete event' })
    }
  })

  // Free/Busy and Find Time Routes
  fastify.post('/calendars/freebusy', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const freeBusyRequest = request.body as any

    try {
      const responses = await caldavService.getFreeBusy(freeBusyRequest)
      return { responses }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get free/busy information' })
    }
  })

  fastify.post('/calendars/findtime', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const findTimeRequest = request.body as any

    try {
      const response = await caldavService.findTime(findTimeRequest)
      return response
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to find available time' })
    }
  })

  // Room and Resource Routes
  fastify.get('/rooms', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const rooms = await caldavService.getRooms()
      return { rooms }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch rooms' })
    }
  })

  fastify.get('/resources', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const resources = await caldavService.getResources()
      return { resources }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch resources' })
    }
  })

  fastify.post('/rooms/:roomId/book', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { roomId } = request.params as { roomId: string }
    const { eventId, start, end } = request.body as { eventId: string; start: string; end: string }

    try {
      const success = await caldavService.bookRoom(roomId, eventId, start, end)
      if (success) {
        return { success: true }
      } else {
        return reply.code(409).send({ error: 'Room is not available for the requested time' })
      }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to book room' })
    }
  })

  // Contact Routes (CardDAV)
  fastify.get('/addressbooks', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const addressBooks = await carddavService.getAddressBooks(userId)
      return { addressBooks }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch address books' })
    }
  })

  fastify.get('/addressbooks/:addressBookId/contacts', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { addressBookId } = request.params as { addressBookId: string }
    const { query } = request.query as { query?: string }

    try {
      const contacts = await carddavService.listContacts(userId, addressBookId, query)
      return { contacts }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch contacts' })
    }
  })

  fastify.get('/addressbooks/:addressBookId/contacts/:contactId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { addressBookId, contactId } = request.params as { addressBookId: string; contactId: string }

    try {
      const contact = await carddavService.getContact(userId, addressBookId, contactId)
      if (!contact) {
        return reply.code(404).send({ error: 'Contact not found' })
      }
      return { contact }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch contact' })
    }
  })

  fastify.post('/addressbooks/:addressBookId/contacts', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { addressBookId } = request.params as { addressBookId: string }
    const contactData = request.body as any

    try {
      const contact = await carddavService.createContact(userId, addressBookId, contactData)
      return reply.code(201).send({ contact })
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create contact' })
    }
  })

  fastify.put('/addressbooks/:addressBookId/contacts/:contactId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { addressBookId, contactId } = request.params as { addressBookId: string; contactId: string }
    const updates = request.body as any

    try {
      const contact = await carddavService.updateContact(userId, addressBookId, contactId, updates)
      return { contact }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update contact' })
    }
  })

  fastify.delete('/addressbooks/:addressBookId/contacts/:contactId', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { addressBookId, contactId } = request.params as { addressBookId: string; contactId: string }

    try {
      await carddavService.deleteContact(userId, addressBookId, contactId)
      return reply.code(204).send()
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete contact' })
    }
  })

  // Contact operations
  fastify.post('/contacts/search', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { query } = request.body as { query: string }

    try {
      const contacts = await carddavService.searchContacts(userId, query)
      return { contacts }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to search contacts' })
    }
  })

  fastify.post('/contacts/merge', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { contactIds } = request.body as { contactIds: string[] }

    try {
      const mergedContact = await carddavService.mergeContacts(userId, contactIds)
      return { contact: mergedContact }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to merge contacts' })
    }
  })

  // ICS and vCard operations
  fastify.post('/calendars/import/ics', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { icsData } = request.body as { icsData: string }

    try {
      const events = await caldavService.parseICS(icsData)
      return { events, count: events.length }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to parse ICS data' })
    }
  })

  fastify.post('/calendars/export/ics', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { eventIds } = request.body as { eventIds: string[] }

    try {
      // Fetch events by IDs (implementation would need to be added)
      const events: any[] = [] // Placeholder
      const icsData = await caldavService.generateICS(events)
      
      reply.header('Content-Type', 'text/calendar')
      reply.header('Content-Disposition', 'attachment; filename="calendar.ics"')
      return icsData
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to generate ICS data' })
    }
  })

  fastify.post('/contacts/import/vcard', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { vCardData } = request.body as { vCardData: string }

    try {
      const contacts = await carddavService.parseVCard(vCardData)
      return { contacts, count: contacts.length }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to parse vCard data' })
    }
  })

  fastify.post('/contacts/export/vcard', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { contactIds } = request.body as { contactIds: string[] }

    try {
      // Fetch contacts by IDs (implementation would need to be added)
      const contacts: any[] = [] // Placeholder
      const vCardData = await carddavService.generateVCard(contacts)
      
      reply.header('Content-Type', 'text/vcard')
      reply.header('Content-Disposition', 'attachment; filename="contacts.vcf"')
      return vCardData
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to generate vCard data' })
    }
  })

  // Invite operations
  fastify.post('/calendars/events/:eventId/invite', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { eventId } = request.params as { eventId: string }
    const { attendees } = request.body as { attendees: string[] }

    try {
      // Fetch event details and send invite
      // This is a placeholder - would need to fetch the actual event
      const event: any = {} // Placeholder
      await caldavService.sendInvite(event, attendees)
      return { success: true }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to send invite' })
    }
  })

  fastify.post('/calendars/events/:eventId/respond', async (request, reply) => {
    const userId = (request as any).user?.email
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { eventId } = request.params as { eventId: string }
    const { response } = request.body as { response: 'accept' | 'decline' | 'tentative' }

    try {
      await caldavService.processInviteResponse(eventId, userId, response)
      return { success: true }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to process invite response' })
    }
  })
}
