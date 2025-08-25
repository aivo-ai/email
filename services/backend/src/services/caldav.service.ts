import { Pool } from 'pg'
// @ts-ignore - Relative import for workspace
import type { 
  CalendarEvent, 
  Contact, 
  Room, 
  Resource, 
  FreeBusyRequest, 
  FreeBusyResponse,
  FindTimeRequest,
  FindTimeResponse,
  Holiday
} from '../../../../contracts/src/index.js'

interface Calendar {
  id: string
  name: string
  color: string
  description?: string
  owner: string
  readOnly: boolean
}

interface TimeSlot {
  start: string
  end: string
}

interface TimeSuggestion {
  start: string
  end: string
  confidence: number
  attendeeAvailability?: Record<string, 'free' | 'busy' | 'tentative'>
}

interface CalDAVService {
  // Calendar operations
  getCalendars(userId: string): Promise<Calendar[]>
  getEvent(userId: string, calendarId: string, eventId: string): Promise<CalendarEvent | null>
  listEvents(userId: string, calendarId: string, start?: string, end?: string): Promise<CalendarEvent[]>
  createEvent(userId: string, calendarId: string, event: Omit<CalendarEvent, 'id' | 'created' | 'updated'>): Promise<CalendarEvent>
  updateEvent(userId: string, calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>
  deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void>
  
  // Free/busy operations
  getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse[]>
  findTime(request: FindTimeRequest): Promise<FindTimeResponse>
  
  // Room/resource operations
  getRooms(): Promise<Room[]>
  getResources(): Promise<Resource[]>
  bookRoom(roomId: string, eventId: string, start: string, end: string): Promise<boolean>
  
  // ICS operations
  parseICS(icsData: string): Promise<CalendarEvent[]>
  generateICS(events: CalendarEvent[]): Promise<string>
  
  // Invite operations
  sendInvite(event: CalendarEvent, attendees: string[]): Promise<void>
  processInviteResponse(eventId: string, attendeeEmail: string, response: 'accept' | 'decline' | 'tentative'): Promise<void>
}

export class CalDAVServiceImpl implements CalDAVService {
  constructor(
    private db: Pool,
    private radicaleUrl: string = 'http://localhost:5232'
  ) {}

  async getCalendars(userId: string): Promise<Calendar[]> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT * FROM calendars 
        WHERE owner = $1 OR id IN (
          SELECT calendar_id FROM calendar_shares WHERE user_id = $1
        )
        ORDER BY name
      `, [userId])
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        description: row.description,
        owner: row.owner,
        readOnly: row.read_only || row.owner !== userId
      }))
    } finally {
      client.release()
    }
  }

  async getEvent(userId: string, calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT e.*, c.owner 
        FROM calendar_events e
        JOIN calendars c ON e.calendar_id = c.id
        WHERE e.id = $1 AND e.calendar_id = $2
        AND (c.owner = $3 OR EXISTS (
          SELECT 1 FROM calendar_shares WHERE calendar_id = $2 AND user_id = $3
        ))
      `, [eventId, calendarId, userId])
      
      if (result.rows.length === 0) return null
      
      return this.mapEventFromDB(result.rows[0])
    } finally {
      client.release()
    }
  }

  async listEvents(userId: string, calendarId: string, start?: string, end?: string): Promise<CalendarEvent[]> {
    const client = await this.db.connect()
    try {
      let sqlQuery = `
        SELECT e.*, c.owner 
        FROM calendar_events e
        JOIN calendars c ON e.calendar_id = c.id
        WHERE e.calendar_id = $1
        AND (c.owner = $2 OR EXISTS (
          SELECT 1 FROM calendar_shares WHERE calendar_id = $1 AND user_id = $2
        ))
      `
      const params: any[] = [calendarId, userId]
      
      if (start) {
        sqlQuery += ` AND e.start_time >= $${params.length + 1}`
        params.push(start)
      }
      
      if (end) {
        sqlQuery += ` AND e.end_time <= $${params.length + 1}`
        params.push(end)
      }
      
      sqlQuery += ` ORDER BY e.start_time`
      
      const result = await client.query(sqlQuery, params)
      return result.rows.map((row: any) => this.mapEventFromDB(row))
    } finally {
      client.release()
    }
  }

  async createEvent(userId: string, calendarId: string, event: Omit<CalendarEvent, 'id' | 'created' | 'updated'>): Promise<CalendarEvent> {
    const client = await this.db.connect()
    try {
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(2)}`
      const now = new Date().toISOString()
      
      const result = await client.query(`
        INSERT INTO calendar_events (
          id, calendar_id, uid, summary, description, start_time, end_time,
          all_day, recurring, recurrence_rule, location, organizer, status,
          created, updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        eventId, calendarId, event.uid || eventId, event.summary, event.description,
        event.start, event.end, event.allDay || false, event.recurring || false,
        event.recurrenceRule, event.location, event.organizer, event.status || 'confirmed',
        now, now
      ])
      
      // Insert attendees
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          await client.query(`
            INSERT INTO event_attendees (event_id, email, name, role, status)
            VALUES ($1, $2, $3, $4, $5)
          `, [eventId, attendee.email, attendee.name, attendee.role || 'required', attendee.status || 'needs-action'])
        }
      }
      
      return this.mapEventFromDB(result.rows[0])
    } finally {
      client.release()
    }
  }

  async updateEvent(userId: string, calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      const setClauses: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (event.summary !== undefined) {
        setClauses.push(`summary = $${paramIndex++}`)
        values.push(event.summary)
      }
      if (event.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`)
        values.push(event.description)
      }
      if (event.start !== undefined) {
        setClauses.push(`start_time = $${paramIndex++}`)
        values.push(event.start)
      }
      if (event.end !== undefined) {
        setClauses.push(`end_time = $${paramIndex++}`)
        values.push(event.end)
      }
      if (event.location !== undefined) {
        setClauses.push(`location = $${paramIndex++}`)
        values.push(event.location)
      }
      if (event.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`)
        values.push(event.status)
      }
      
      setClauses.push(`updated = $${paramIndex++}`)
      values.push(new Date().toISOString())
      
      values.push(eventId, calendarId, userId)
      
      await client.query(`
        UPDATE calendar_events SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND calendar_id = $${paramIndex++}
        AND EXISTS (
          SELECT 1 FROM calendars c WHERE c.id = calendar_id AND c.owner = $${paramIndex++}
        )
      `, values)
      
      // Update attendees if provided
      if (event.attendees) {
        await client.query('DELETE FROM event_attendees WHERE event_id = $1', [eventId])
        
        for (const attendee of event.attendees) {
          await client.query(`
            INSERT INTO event_attendees (event_id, email, name, role, status)
            VALUES ($1, $2, $3, $4, $5)
          `, [eventId, attendee.email, attendee.name, attendee.role || 'required', attendee.status || 'needs-action'])
        }
      }
      
      await client.query('COMMIT')
      
      const updated = await this.getEvent(userId, calendarId, eventId)
      return updated!
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      await client.query('DELETE FROM event_attendees WHERE event_id = $1', [eventId])
      
      await client.query(`
        DELETE FROM calendar_events 
        WHERE id = $1 AND calendar_id = $2
        AND EXISTS (
          SELECT 1 FROM calendars c WHERE c.id = calendar_id AND c.owner = $3
        )
      `, [eventId, calendarId, userId])
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse[]> {
    const client = await this.db.connect()
    try {
      const responses: FreeBusyResponse[] = []
      
      for (const attendee of request.attendees) {
        const busy: TimeSlot[] = []
        const tentative: TimeSlot[] = []
        
        // Get events for this attendee within the time range
        const eventsResult = await client.query(`
          SELECT e.start_time, e.end_time, ea.status
          FROM calendar_events e
          JOIN event_attendees ea ON e.id = ea.event_id
          WHERE ea.email = $1
          AND e.start_time >= $2 AND e.end_time <= $3
          AND e.status != 'cancelled'
        `, [attendee, request.start, request.end])
        
        for (const event of eventsResult.rows) {
          const timeSlot: TimeSlot = {
            start: event.start_time,
            end: event.end_time
          }
          
          if (event.status === 'tentative') {
            tentative.push(timeSlot)
          } else if (event.status === 'confirmed') {
            busy.push(timeSlot)
          }
        }
        
        // Get working hours constraints
        const workingHoursResult = await client.query(`
          SELECT start_time, end_time, days_of_week
          FROM working_hours
          WHERE user_email = $1
        `, [attendee])
        
        // Get holidays
        const holidaysResult = await client.query(`
          SELECT date, name
          FROM holidays
          WHERE date >= $1 AND date <= $2
        `, [request.start.split('T')[0], request.end.split('T')[0]])
        
        responses.push({
          attendee,
          busy,
          tentative
        })
      }
      
      return responses
    } finally {
      client.release()
    }
  }

  async findTime(request: FindTimeRequest): Promise<FindTimeResponse> {
    const freeBusyRequest: FreeBusyRequest = {
      attendees: request.attendees,
      start: request.timeRange.start,
      end: request.timeRange.end
    }
    
    const freeBusyResponses = await this.getFreeBusy(freeBusyRequest)
    const suggestions: TimeSuggestion[] = []
    
    // Simple algorithm to find available time slots
    const startTime = new Date(request.timeRange.start)
    const endTime = new Date(request.timeRange.end)
    const duration = request.duration * 60 * 1000 // Convert minutes to milliseconds
    
    // Generate 30-minute time slots
    for (let current = new Date(startTime); current <= endTime; current.setMinutes(current.getMinutes() + 30)) {
      const slotStart = new Date(current)
      const slotEnd = new Date(current.getTime() + duration)
      
      if (slotEnd > endTime) break
      
      // Check if this slot conflicts with any attendee's schedule
      let conflicts = 0
      const attendeeAvailability: Record<string, 'free' | 'busy' | 'tentative'> = {}
      
      for (const response of freeBusyResponses) {
        const isBusy = response.busy.some((slot: TimeSlot) =>
          (new Date(slot.start) < slotEnd && new Date(slot.end) > slotStart)
        )
        const isTentative = response.tentative.some((slot: TimeSlot) =>
          (new Date(slot.start) < slotEnd && new Date(slot.end) > slotStart)
        )
        
        if (isBusy) {
          conflicts += 2 // Busy conflict is worse
          attendeeAvailability[response.attendee] = 'busy'
        } else if (isTentative) {
          conflicts += 1 // Tentative conflict is less severe
          attendeeAvailability[response.attendee] = 'tentative'
        } else {
          attendeeAvailability[response.attendee] = 'free'
        }
      }
      
      // Calculate confidence (0-100, higher is better)
      const totalAttendees = request.attendees.length
      const confidence = Math.max(0, 100 - (conflicts * 100) / (totalAttendees * 2))
      
      if (confidence >= (request.minConfidence || 70)) {
        suggestions.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          confidence,
          attendeeAvailability
        })
      }
    }
    
    // Sort by confidence, then by start time
    suggestions.sort((a, b) => b.confidence - a.confidence || a.start.localeCompare(b.start))
    
    return {
      timeRange: request.timeRange,
      duration: request.duration,
      suggestions: suggestions.slice(0, 10)
    }
  }

  async getRooms(): Promise<Room[]> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT * FROM rooms 
        WHERE active = true
        ORDER BY name
      `)
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        capacity: row.capacity,
        location: row.location,
        equipment: row.equipment ? JSON.parse(row.equipment) : [],
        active: row.active
      }))
    } finally {
      client.release()
    }
  }

  async getResources(): Promise<Resource[]> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT * FROM resources 
        WHERE active = true
        ORDER BY name
      `)
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        type: row.type,
        location: row.location,
        active: row.active
      }))
    } finally {
      client.release()
    }
  }

  async bookRoom(roomId: string, eventId: string, start: string, end: string): Promise<boolean> {
    const client = await this.db.connect()
    try {
      // Check if room is available
      const conflictResult = await client.query(`
        SELECT id FROM room_bookings
        WHERE room_id = $1
        AND start_time < $3 AND end_time > $2
        AND status = 'confirmed'
      `, [roomId, start, end])
      
      if (conflictResult.rows.length > 0) {
        return false // Room is not available
      }
      
      // Book the room
      await client.query(`
        INSERT INTO room_bookings (room_id, event_id, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, 'confirmed')
      `, [roomId, eventId, start, end])
      
      return true
    } finally {
      client.release()
    }
  }

  async parseICS(icsData: string): Promise<CalendarEvent[]> {
    // Simple ICS parser (in production, use a proper library like ical.js)
    const events: CalendarEvent[] = []
    const lines = icsData.split('\n').map(line => line.trim())
    
    let currentEvent: Partial<CalendarEvent> | null = null
    
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {
          attendees: []
        }
      } else if (line === 'END:VEVENT' && currentEvent) {
        events.push(currentEvent as CalendarEvent)
        currentEvent = null
      } else if (currentEvent && line.includes(':')) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':')
        
        switch (key) {
          case 'UID':
            currentEvent.uid = value
            break
          case 'SUMMARY':
            currentEvent.summary = value
            break
          case 'DESCRIPTION':
            currentEvent.description = value
            break
          case 'DTSTART':
            currentEvent.start = this.parseDateTimeValue(value)
            break
          case 'DTEND':
            currentEvent.end = this.parseDateTimeValue(value)
            break
          case 'LOCATION':
            currentEvent.location = value
            break
          case 'ORGANIZER':
            currentEvent.organizer = value.replace('mailto:', '')
            break
          case 'STATUS':
            currentEvent.status = value.toLowerCase() as any
            break
        }
      }
    }
    
    return events
  }

  async generateICS(events: CalendarEvent[]): Promise<string> {
    let ics = 'BEGIN:VCALENDAR\n'
    ics += 'VERSION:2.0\n'
    ics += 'PRODID:-//CEERION//Mail System//EN\n'
    
    for (const event of events) {
      ics += 'BEGIN:VEVENT\n'
      ics += `UID:${event.uid}\n`
      ics += `SUMMARY:${event.summary}\n`
      if (event.description) ics += `DESCRIPTION:${event.description}\n`
      ics += `DTSTART:${this.formatDateTimeValue(event.start)}\n`
      ics += `DTEND:${this.formatDateTimeValue(event.end)}\n`
      if (event.location) ics += `LOCATION:${event.location}\n`
      if (event.organizer) ics += `ORGANIZER:mailto:${event.organizer}\n`
      ics += `STATUS:${(event.status || 'confirmed').toUpperCase()}\n`
      ics += `CREATED:${this.formatDateTimeValue(event.created || new Date().toISOString())}\n`
      ics += `LAST-MODIFIED:${this.formatDateTimeValue(event.updated || new Date().toISOString())}\n`
      
      if (event.attendees) {
        for (const attendee of event.attendees) {
          ics += `ATTENDEE;CN=${attendee.name || attendee.email};PARTSTAT=${(attendee.status || 'needs-action').toUpperCase()}:mailto:${attendee.email}\n`
        }
      }
      
      ics += 'END:VEVENT\n'
    }
    
    ics += 'END:VCALENDAR'
    return ics
  }

  async sendInvite(event: CalendarEvent, attendees: string[]): Promise<void> {
    // Integration with email service to send calendar invites
    const icsData = await this.generateICS([event])
    
    // This would integrate with your email service
    // For now, this is a placeholder
    console.log(`Sending invite for event ${event.summary} to:`, attendees)
    console.log('ICS Data:', icsData)
  }

  async processInviteResponse(eventId: string, attendeeEmail: string, response: 'accept' | 'decline' | 'tentative'): Promise<void> {
    const client = await this.db.connect()
    try {
      await client.query(`
        UPDATE event_attendees 
        SET status = $1, response_time = $2
        WHERE event_id = $3 AND email = $4
      `, [response === 'accept' ? 'accepted' : response === 'decline' ? 'declined' : 'tentative', new Date().toISOString(), eventId, attendeeEmail])
    } finally {
      client.release()
    }
  }

  private mapEventFromDB(row: any): CalendarEvent {
    return {
      id: row.id,
      uid: row.uid,
      summary: row.summary,
      description: row.description,
      start: row.start_time,
      end: row.end_time,
      allDay: row.all_day,
      recurring: row.recurring,
      recurrenceRule: row.recurrence_rule,
      location: row.location,
      organizer: row.organizer,
      status: row.status,
      created: row.created,
      updated: row.updated,
      attendees: [] // Would be populated separately
    }
  }

  private parseDateTimeValue(value: string): string {
    // Simple date parser for ICS format
    if (value.includes('T')) {
      return new Date(value.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toISOString()
    }
    return value
  }

  private formatDateTimeValue(isoString: string): string {
    // Format for ICS
    return isoString.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  }
}

export type { CalDAVService }
