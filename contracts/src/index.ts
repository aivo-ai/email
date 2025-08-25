export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailMessage {
  id: string
  subject: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  replyTo?: EmailAddress
  date: string
  textBody?: string
  htmlBody?: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  id: string
  filename: string
  contentType: string
  size: number
  cid?: string
}

export interface Mailbox {
  id: string
  name: string
  role?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'junk'
  parentId?: string
  sortOrder: number
  totalEmails: number
  unreadEmails: number
}

export interface EmailThread {
  id: string
  emailIds: string[]
}

// Calendar and Contacts Interfaces
export interface CalendarEvent {
  id: string
  uid: string
  summary: string
  description?: string
  location?: string
  start: EventDateTime
  end: EventDateTime
  allDay?: boolean
  recurrence?: RecurrenceRule
  attendees?: Attendee[]
  organizer?: EmailAddress
  status: 'confirmed' | 'tentative' | 'cancelled'
  visibility: 'public' | 'private' | 'confidential'
  calendar: string
  created: string
  updated: string
  sequence: number
  reminders?: Reminder[]
  meetingUrl?: string
  roomId?: string
}

export interface EventDateTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval?: number
  count?: number
  until?: string
  byDay?: string[]
  byMonth?: number[]
  byMonthDay?: number[]
}

export interface Attendee {
  email: string
  name?: string
  role: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT' | 'CHAIR'
  status: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED'
  rsvp?: boolean
}

export interface Reminder {
  method: 'email' | 'popup' | 'sms'
  minutes: number
}

export interface Calendar {
  id: string
  name: string
  description?: string
  color: string
  owner: string
  readOnly: boolean
  defaultReminders?: Reminder[]
}

export interface Contact {
  id: string
  uid: string
  displayName: string
  firstName?: string
  lastName?: string
  middleName?: string
  nickname?: string
  prefix?: string
  suffix?: string
  emails: ContactEmail[]
  phones?: ContactPhone[]
  addresses?: ContactAddress[]
  organization?: string
  title?: string
  department?: string
  birthday?: string
  notes?: string
  photo?: string
  created: string
  updated: string
}

export interface ContactEmail {
  email: string
  type: 'work' | 'home' | 'other'
  primary?: boolean
}

export interface ContactPhone {
  number: string
  type: 'work' | 'home' | 'mobile' | 'fax' | 'other'
  primary?: boolean
}

export interface ContactAddress {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  type: 'work' | 'home' | 'other'
  primary?: boolean
}

export interface Room {
  id: string
  name: string
  email: string
  description?: string
  capacity: number
  features: string[]
  location?: string
  building?: string
  floor?: string
  availability: AvailabilityRule[]
}

export interface Resource {
  id: string
  name: string
  email: string
  description?: string
  type: 'equipment' | 'vehicle' | 'service'
  features: string[]
  availability: AvailabilityRule[]
}

export interface AvailabilityRule {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  timeZone: string
}

export interface FreeBusyRequest {
  attendees: string[]
  start: string
  end: string
  timeZone?: string
}

export interface FreeBusyResponse {
  attendee: string
  busy: TimeSlot[]
  tentative: TimeSlot[]
}

export interface TimeSlot {
  start: string
  end: string
}

export interface FindTimeRequest {
  attendees: string[]
  duration: number // minutes
  start: string
  end: string
  timeZone?: string
  workingHours?: WorkingHours
  excludeWeekends?: boolean
}

export interface FindTimeResponse {
  suggestions: TimeSuggestion[]
}

export interface TimeSuggestion {
  start: string
  end: string
  confidence: number
  attendeeAvailability: AttendeeAvailability[]
}

export interface AttendeeAvailability {
  attendee: string
  status: 'free' | 'busy' | 'tentative' | 'unknown'
}

export interface WorkingHours {
  monday?: DaySchedule
  tuesday?: DaySchedule
  wednesday?: DaySchedule
  thursday?: DaySchedule
  friday?: DaySchedule
  saturday?: DaySchedule
  sunday?: DaySchedule
  timeZone: string
}

export interface DaySchedule {
  startTime: string // HH:MM format
  endTime: string // HH:MM format
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'national' | 'company' | 'department'
  description?: string
}

export interface SearchQuery {
  text?: string
  from?: string
  to?: string
  subject?: string
  before?: string
  after?: string
  hasAttachment?: boolean
  inMailbox?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Domain enforcement
export const DOMAIN_CONFIG = {
  domain: 'ceerion.com',
  host: 'mail.ceerion.com'
} as const
