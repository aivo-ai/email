-- Migration: Add collaboration tables for CalDAV/CardDAV support
-- Run this after the main mail system tables

-- Calendars table
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#2196F3',
  description TEXT,
  owner VARCHAR(255) NOT NULL,
  read_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  uid VARCHAR(255) UNIQUE NOT NULL,
  summary VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  location VARCHAR(500),
  organizer VARCHAR(255),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'required' CHECK (role IN ('required', 'optional', 'chair')),
  status VARCHAR(20) DEFAULT 'needs-action' CHECK (status IN ('needs-action', 'accepted', 'declined', 'tentative', 'delegated')),
  response_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  permission VARCHAR(20) DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Address books table
CREATE TABLE IF NOT EXISTS address_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner VARCHAR(255) NOT NULL,
  read_only BOOLEAN DEFAULT FALSE,
  color VARCHAR(7) DEFAULT '#4CAF50',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_book_id UUID REFERENCES address_books(id) ON DELETE CASCADE,
  uid VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  middle_name VARCHAR(255),
  name_prefix VARCHAR(50),
  name_suffix VARCHAR(50),
  nickname VARCHAR(255),
  organization VARCHAR(255),
  title VARCHAR(255),
  department VARCHAR(255),
  birthday DATE,
  anniversary DATE,
  notes TEXT,
  photo TEXT, -- Base64 encoded or URL
  created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact emails table
CREATE TABLE IF NOT EXISTS contact_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'work' CHECK (type IN ('work', 'personal', 'other')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact phones table
CREATE TABLE IF NOT EXISTS contact_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'work' CHECK (type IN ('work', 'personal', 'mobile', 'fax', 'other')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact addresses table
CREATE TABLE IF NOT EXISTS contact_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type VARCHAR(50) DEFAULT 'work' CHECK (type IN ('work', 'personal', 'other')),
  street VARCHAR(500),
  city VARCHAR(255),
  state VARCHAR(255),
  postal_code VARCHAR(50),
  country VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Address book shares table
CREATE TABLE IF NOT EXISTS address_book_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_book_id UUID REFERENCES address_books(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  permission VARCHAR(20) DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table for meeting room management
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  capacity INTEGER,
  location VARCHAR(500),
  equipment JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table for bookable resources
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  location VARCHAR(500),
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room bookings table
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource bookings table
CREATE TABLE IF NOT EXISTS resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Working hours table for availability management
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_email, day_of_week)
);

-- Holidays table for holiday management
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) DEFAULT 'public' CHECK (type IN ('public', 'company', 'personal')),
  domain VARCHAR(255), -- For domain-specific holidays
  user_email VARCHAR(255), -- For personal holidays
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Free/busy cache table for performance
CREATE TABLE IF NOT EXISTS freebusy_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  busy_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  tentative_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_uid ON calendar_events(uid);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(email);

CREATE INDEX IF NOT EXISTS idx_calendar_shares_calendar_id ON calendar_shares(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user_id ON calendar_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_address_book_id ON contacts(address_book_id);
CREATE INDEX IF NOT EXISTS idx_contacts_display_name ON contacts(display_name);
CREATE INDEX IF NOT EXISTS idx_contacts_uid ON contacts(uid);

CREATE INDEX IF NOT EXISTS idx_contact_emails_contact_id ON contact_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_emails_email ON contact_emails(email);

CREATE INDEX IF NOT EXISTS idx_contact_phones_contact_id ON contact_phones(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_phones_number ON contact_phones(number);

CREATE INDEX IF NOT EXISTS idx_contact_addresses_contact_id ON contact_addresses(contact_id);

CREATE INDEX IF NOT EXISTS idx_address_book_shares_address_book_id ON address_book_shares(address_book_id);
CREATE INDEX IF NOT EXISTS idx_address_book_shares_user_id ON address_book_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_room_bookings_end_time ON room_bookings(end_time);

CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource_id ON resource_bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_start_time ON resource_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_end_time ON resource_bookings(end_time);

CREATE INDEX IF NOT EXISTS idx_working_hours_user_email ON working_hours(user_email);
CREATE INDEX IF NOT EXISTS idx_working_hours_day_of_week ON working_hours(day_of_week);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_domain ON holidays(domain);
CREATE INDEX IF NOT EXISTS idx_holidays_user_email ON holidays(user_email);

CREATE INDEX IF NOT EXISTS idx_freebusy_cache_user_email ON freebusy_cache(user_email);
CREATE INDEX IF NOT EXISTS idx_freebusy_cache_start_time ON freebusy_cache(start_time);
CREATE INDEX IF NOT EXISTS idx_freebusy_cache_end_time ON freebusy_cache(end_time);
CREATE INDEX IF NOT EXISTS idx_freebusy_cache_expires_at ON freebusy_cache(expires_at);

-- Insert default calendars and address books for existing users
-- This would be done by the application on first setup
INSERT INTO calendars (name, owner, color) 
SELECT 'Personal Calendar', email, '#2196F3' 
FROM users 
WHERE NOT EXISTS (SELECT 1 FROM calendars WHERE owner = users.email)
ON CONFLICT DO NOTHING;

INSERT INTO address_books (name, owner, color) 
SELECT 'Personal Contacts', email, '#4CAF50' 
FROM users 
WHERE NOT EXISTS (SELECT 1 FROM address_books WHERE owner = users.email)
ON CONFLICT DO NOTHING;

-- Sample working hours (9 AM to 5 PM, Monday to Friday)
INSERT INTO working_hours (user_email, day_of_week, start_time, end_time)
SELECT email, generate_series(1, 5), '09:00:00', '17:00:00'
FROM users 
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE user_email = users.email)
ON CONFLICT DO NOTHING;

-- Sample rooms
INSERT INTO rooms (name, email, capacity, location, equipment, features) VALUES
('Conference Room A', 'conference-a@company.com', 10, 'Building A, Floor 2', '["projector", "whiteboard", "conference_phone"]', '["video_conferencing", "wireless_display"]'),
('Conference Room B', 'conference-b@company.com', 6, 'Building A, Floor 2', '["tv_screen", "whiteboard"]', '["wireless_display"]'),
('Meeting Room 1', 'meeting-1@company.com', 4, 'Building B, Floor 1', '["whiteboard"]', '[]'),
('Board Room', 'boardroom@company.com', 20, 'Building A, Floor 3', '["projector", "conference_phone", "whiteboard"]', '["video_conferencing", "wireless_display", "catering_ready"]')
ON CONFLICT DO NOTHING;

-- Sample resources
INSERT INTO resources (name, email, type, location, features) VALUES
('Laptop Cart A', 'laptop-cart-a@company.com', 'equipment', 'IT Storage Room', '["laptops", "chargers", "mobile"]'),
('Projector 1', 'projector-1@company.com', 'equipment', 'AV Storage', '["portable", "hdmi", "vga"]'),
('Catering Service', 'catering@company.com', 'service', 'Kitchen', '["coffee", "lunch", "snacks"]')
ON CONFLICT DO NOTHING;

-- Sample company holidays
INSERT INTO holidays (name, date, type, domain) VALUES
('New Year''s Day', '2024-01-01', 'public', NULL),
('Independence Day', '2024-07-04', 'public', NULL),
('Christmas Day', '2024-12-25', 'public', NULL),
('Company Founding Day', '2024-06-15', 'company', 'company.com')
ON CONFLICT DO NOTHING;
