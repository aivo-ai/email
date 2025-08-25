import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const EmailContentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  folderId: z.string(),
  headers: z.record(z.string()),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    contentType: z.string(),
    content: z.string().optional()
  })),
  timestamp: z.string().transform(str => new Date(str))
});

const CalendarEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  attendees: z.array(z.string()),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str))
});

const ContactSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  notes: z.string().optional()
});

export const ingestorRoutes: FastifyPluginAsync = async (fastify) => {
  // Ingest email
  fastify.post('/email', {
    schema: {
      body: EmailContentSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          id: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const email = request.body;
    
    try {
      await fastify.ingestor.ingestEmail(email);
      return { success: true, id: email.id };
    } catch (error) {
      fastify.log.error(error, 'Email ingestion failed');
      throw fastify.httpErrors.internalServerError('Email ingestion failed');
    }
  });
  
  // Ingest calendar event
  fastify.post('/calendar', {
    schema: {
      body: CalendarEventSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          id: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const event = request.body;
    
    try {
      await fastify.ingestor.ingestCalendarEvent(event);
      return { success: true, id: event.id };
    } catch (error) {
      fastify.log.error(error, 'Calendar event ingestion failed');
      throw fastify.httpErrors.internalServerError('Calendar event ingestion failed');
    }
  });
  
  // Ingest contact
  fastify.post('/contact', {
    schema: {
      body: ContactSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          id: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const contact = request.body;
    
    try {
      await fastify.ingestor.ingestContact(contact);
      return { success: true, id: contact.id };
    } catch (error) {
      fastify.log.error(error, 'Contact ingestion failed');
      throw fastify.httpErrors.internalServerError('Contact ingestion failed');
    }
  });
  
  // Bulk ingestion endpoint
  fastify.post('/bulk', {
    schema: {
      body: z.object({
        emails: z.array(EmailContentSchema).optional(),
        events: z.array(CalendarEventSchema).optional(),
        contacts: z.array(ContactSchema).optional()
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          processed: z.object({
            emails: z.number(),
            events: z.number(),
            contacts: z.number()
          }),
          errors: z.array(z.string())
        })
      }
    }
  }, async (request, reply) => {
    const { emails = [], events = [], contacts = [] } = request.body;
    const errors: string[] = [];
    let emailsProcessed = 0;
    let eventsProcessed = 0;
    let contactsProcessed = 0;
    
    // Process emails
    for (const email of emails) {
      try {
        await fastify.ingestor.ingestEmail(email);
        emailsProcessed++;
      } catch (error) {
        errors.push(`Email ${email.id}: ${error.message}`);
      }
    }
    
    // Process events
    for (const event of events) {
      try {
        await fastify.ingestor.ingestCalendarEvent(event);
        eventsProcessed++;
      } catch (error) {
        errors.push(`Event ${event.id}: ${error.message}`);
      }
    }
    
    // Process contacts
    for (const contact of contacts) {
      try {
        await fastify.ingestor.ingestContact(contact);
        contactsProcessed++;
      } catch (error) {
        errors.push(`Contact ${contact.id}: ${error.message}`);
      }
    }
    
    return {
      success: errors.length === 0,
      processed: {
        emails: emailsProcessed,
        events: eventsProcessed,
        contacts: contactsProcessed
      },
      errors
    };
  });
  
  // Delete endpoints
  fastify.delete('/email/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      await fastify.ingestor.removeEmail(id);
      return { success: true };
    } catch (error) {
      fastify.log.error(error, 'Email deletion failed');
      throw fastify.httpErrors.internalServerError('Email deletion failed');
    }
  });
  
  fastify.delete('/calendar/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      await fastify.ingestor.removeCalendarEvent(id);
      return { success: true };
    } catch (error) {
      fastify.log.error(error, 'Calendar event deletion failed');
      throw fastify.httpErrors.internalServerError('Calendar event deletion failed');
    }
  });
  
  fastify.delete('/contact/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      await fastify.ingestor.removeContact(id);
      return { success: true };
    } catch (error) {
      fastify.log.error(error, 'Contact deletion failed');
      throw fastify.httpErrors.internalServerError('Contact deletion failed');
    }
  });
};
