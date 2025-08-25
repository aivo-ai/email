import { Pool } from 'pg'
// @ts-ignore - Relative import for workspace
import type { Contact, ContactEmail, ContactPhone, ContactAddress } from '../../../../contracts/src/index.js'

interface AddressBook {
  id: string
  name: string
  description?: string
  owner: string
  readOnly: boolean
  color: string
}

export class CardDAVServiceImpl {
  constructor(
    private db: Pool,
    private radicaleUrl: string = 'http://localhost:5232'
  ) {}

  async getAddressBooks(userId: string): Promise<AddressBook[]> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT * FROM address_books 
        WHERE owner = $1 OR id IN (
          SELECT address_book_id FROM address_book_shares WHERE user_id = $1
        )
        ORDER BY name
      `, [userId])
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        owner: row.owner,
        readOnly: row.read_only,
        color: row.color
      }))
    } finally {
      client.release()
    }
  }

  async getContact(userId: string, addressBookId: string, contactId: string): Promise<Contact | null> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT c.*, ab.owner 
        FROM contacts c
        JOIN address_books ab ON c.address_book_id = ab.id
        WHERE c.id = $1 AND c.address_book_id = $2
        AND (ab.owner = $3 OR EXISTS (
          SELECT 1 FROM address_book_shares WHERE address_book_id = $2 AND user_id = $3
        ))
      `, [contactId, addressBookId, userId])
      
      if (result.rows.length === 0) return null
      
      const contact = await this.mapContactFromDB(result.rows[0])
      return contact
    } finally {
      client.release()
    }
  }

  async listContacts(userId: string, addressBookId: string, query?: string): Promise<Contact[]> {
    const client = await this.db.connect()
    try {
      let sqlQuery = `
        SELECT c.*, ab.owner 
        FROM contacts c
        JOIN address_books ab ON c.address_book_id = ab.id
        WHERE c.address_book_id = $1
        AND (ab.owner = $2 OR EXISTS (
          SELECT 1 FROM address_book_shares WHERE address_book_id = $1 AND user_id = $2
        ))
      `
      const params = [addressBookId, userId]
      
      if (query) {
        sqlQuery += ` AND (c.display_name ILIKE $3 OR c.first_name ILIKE $3 OR c.last_name ILIKE $3 OR c.organization ILIKE $3)`
        params.push(`%${query}%`)
      }
      
      sqlQuery += ` ORDER BY c.display_name`
      
      const result = await client.query(sqlQuery, params)
      const contacts = await Promise.all(
        result.rows.map((row: any) => this.mapContactFromDB(row))
      )
      
      return contacts
    } finally {
      client.release()
    }
  }

  async createContact(userId: string, addressBookId: string, contact: Omit<Contact, 'id' | 'created' | 'updated'>): Promise<Contact> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      const now = new Date().toISOString()
      const contactResult = await client.query(`
        INSERT INTO contacts (
          uid, address_book_id, display_name, first_name, last_name, middle_name,
          nickname, prefix, suffix, organization, title, department, birthday,
          notes, photo, created, updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16
        ) RETURNING *
      `, [
        contact.uid,
        addressBookId,
        contact.displayName,
        contact.firstName,
        contact.lastName,
        contact.middleName,
        contact.nickname,
        contact.prefix,
        contact.suffix,
        contact.organization,
        contact.title,
        contact.department,
        contact.birthday,
        contact.notes,
        contact.photo,
        now
      ])
      
      const contactId = contactResult.rows[0].id
      
      // Insert emails
      for (const email of contact.emails) {
        await client.query(`
          INSERT INTO contact_emails (contact_id, email, type, is_primary)
          VALUES ($1, $2, $3, $4)
        `, [contactId, email.email, email.type, email.primary || false])
      }
      
      // Insert phones
      if (contact.phones) {
        for (const phone of contact.phones) {
          await client.query(`
            INSERT INTO contact_phones (contact_id, number, type, is_primary)
            VALUES ($1, $2, $3, $4)
          `, [contactId, phone.number, phone.type, phone.primary || false])
        }
      }
      
      // Insert addresses
      if (contact.addresses) {
        for (const address of contact.addresses) {
          await client.query(`
            INSERT INTO contact_addresses (contact_id, street, city, state, postal_code, country, type, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [contactId, address.street, address.city, address.state, address.postalCode, address.country, address.type, address.primary || false])
        }
      }
      
      await client.query('COMMIT')
      
      const createdContact = await this.mapContactFromDB(contactResult.rows[0])
      return createdContact
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async updateContact(userId: string, addressBookId: string, contactId: string, contact: Partial<Contact>): Promise<Contact> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      const now = new Date().toISOString()
      await client.query(`
        UPDATE contacts SET
          display_name = COALESCE($1, display_name),
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          middle_name = COALESCE($4, middle_name),
          nickname = COALESCE($5, nickname),
          prefix = COALESCE($6, prefix),
          suffix = COALESCE($7, suffix),
          organization = COALESCE($8, organization),
          title = COALESCE($9, title),
          department = COALESCE($10, department),
          birthday = COALESCE($11, birthday),
          notes = COALESCE($12, notes),
          photo = COALESCE($13, photo),
          updated = $14
        WHERE id = $15 AND address_book_id = $16
      `, [
        contact.displayName,
        contact.firstName,
        contact.lastName,
        contact.middleName,
        contact.nickname,
        contact.prefix,
        contact.suffix,
        contact.organization,
        contact.title,
        contact.department,
        contact.birthday,
        contact.notes,
        contact.photo,
        now,
        contactId,
        addressBookId
      ])
      
      // Update emails if provided
      if (contact.emails) {
        await client.query('DELETE FROM contact_emails WHERE contact_id = $1', [contactId])
        for (const email of contact.emails) {
          await client.query(`
            INSERT INTO contact_emails (contact_id, email, type, is_primary)
            VALUES ($1, $2, $3, $4)
          `, [contactId, email.email, email.type, email.primary || false])
        }
      }
      
      // Update phones if provided
      if (contact.phones) {
        await client.query('DELETE FROM contact_phones WHERE contact_id = $1', [contactId])
        for (const phone of contact.phones) {
          await client.query(`
            INSERT INTO contact_phones (contact_id, number, type, is_primary)
            VALUES ($1, $2, $3, $4)
          `, [contactId, phone.number, phone.type, phone.primary || false])
        }
      }
      
      // Update addresses if provided
      if (contact.addresses) {
        await client.query('DELETE FROM contact_addresses WHERE contact_id = $1', [contactId])
        for (const address of contact.addresses) {
          await client.query(`
            INSERT INTO contact_addresses (contact_id, street, city, state, postal_code, country, type, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [contactId, address.street, address.city, address.state, address.postalCode, address.country, address.type, address.primary || false])
        }
      }
      
      await client.query('COMMIT')
      
      const updatedContact = await this.getContact(userId, addressBookId, contactId)
      return updatedContact!
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async deleteContact(userId: string, addressBookId: string, contactId: string): Promise<void> {
    const client = await this.db.connect()
    try {
      await client.query(`
        DELETE FROM contacts 
        WHERE id = $1 AND address_book_id = $2
      `, [contactId, addressBookId])
    } finally {
      client.release()
    }
  }

  async mergeContacts(userId: string, contactIds: string[]): Promise<Contact> {
    const client = await this.db.connect()
    try {
      await client.query('BEGIN')
      
      // Get all contacts to merge
      const contactsResult = await client.query(`
        SELECT c.* FROM contacts c
        JOIN address_books ab ON c.address_book_id = ab.id
        WHERE c.id = ANY($1) AND ab.owner = $2
      `, [contactIds, userId])
      
      const contacts = await Promise.all(
        contactsResult.rows.map(row => this.mapContactFromDB(row))
      )
      
      if (contacts.length < 2) {
        throw new Error('At least 2 contacts required for merging')
      }
      
      // Merge contact data
      const merged: Partial<Contact> = {
        uid: `merged-${Date.now()}`,
        displayName: contacts[0].displayName,
        firstName: contacts.find((c: Contact) => c.firstName)?.firstName,
        lastName: contacts.find((c: Contact) => c.lastName)?.lastName,
        organization: contacts.find((c: Contact) => c.organization)?.organization,
        title: contacts.find((c: Contact) => c.title)?.title,
        department: contacts.find((c: Contact) => c.department)?.department,
        birthday: contacts.find((c: Contact) => c.birthday)?.birthday,
        notes: contacts.map((c: Contact) => c.notes).filter(Boolean).join('\n\n'),
        photo: contacts.find((c: Contact) => c.photo)?.photo
      }
      
      // Merge emails (deduplicate)
      const allEmails = contacts.flatMap((c: Contact) => c.emails)
      const uniqueEmails = allEmails.filter((email: ContactEmail, index: number, arr: ContactEmail[]) => 
        arr.findIndex((e: ContactEmail) => e.email === email.email) === index
      )
      merged.emails = uniqueEmails
      
      // Merge phones (deduplicate)
      const allPhones = contacts.flatMap((c: Contact) => c.phones || [])
      const uniquePhones = allPhones.filter((phone: ContactPhone, index: number, arr: ContactPhone[]) => 
        arr.findIndex((p: ContactPhone) => p.number === phone.number) === index
      )
      merged.phones = uniquePhones
      
      // Merge addresses (deduplicate)
      const allAddresses = contacts.flatMap((c: Contact) => c.addresses || [])
      const uniqueAddresses = allAddresses.filter((address: ContactAddress, index: number, arr: ContactAddress[]) => 
        arr.findIndex((a: ContactAddress) => 
          a.street === address.street && 
          a.city === address.city && 
          a.postalCode === address.postalCode
        ) === index
      )
      merged.addresses = uniqueAddresses
      
      // Create merged contact
      const addressBookId = contacts[0].id // Use first contact's address book
      const mergedContact = await this.createContact(userId, addressBookId, merged as Omit<Contact, 'id' | 'created' | 'updated'>)
      
      // Delete original contacts
      for (const contactId of contactIds) {
        await this.deleteContact(userId, addressBookId, contactId)
      }
      
      await client.query('COMMIT')
      return mergedContact
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    const client = await this.db.connect()
    try {
      const result = await client.query(`
        SELECT DISTINCT c.*, ab.owner 
        FROM contacts c
        JOIN address_books ab ON c.address_book_id = ab.id
        LEFT JOIN contact_emails ce ON c.id = ce.contact_id
        WHERE (ab.owner = $1 OR EXISTS (
          SELECT 1 FROM address_book_shares WHERE address_book_id = ab.id AND user_id = $1
        ))
        AND (
          c.display_name ILIKE $2 OR 
          c.first_name ILIKE $2 OR 
          c.last_name ILIKE $2 OR 
          c.organization ILIKE $2 OR
          ce.email ILIKE $2
        )
        ORDER BY c.display_name
        LIMIT 50
      `, [userId, `%${query}%`])
      
      const contacts = await Promise.all(
        result.rows.map(row => this.mapContactFromDB(row))
      )
      
      return contacts
    } finally {
      client.release()
    }
  }

  async parseVCard(vCardData: string): Promise<Contact> {
    // Basic vCard parsing - in production, use a proper vCard library
    const lines = vCardData.split('\n').map(line => line.trim())
    const contact: Partial<Contact> = {
      uid: `imported-${Date.now()}`,
      emails: [],
      phones: [],
      addresses: []
    }
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':')
      const [prop, ...params] = key.split(';')
      
      switch (prop) {
        case 'FN':
          contact.displayName = value
          break
        case 'N':
          const nameParts = value.split(';')
          contact.lastName = nameParts[0]
          contact.firstName = nameParts[1]
          contact.middleName = nameParts[2]
          contact.prefix = nameParts[3]
          contact.suffix = nameParts[4]
          break
        case 'EMAIL':
          const emailType = params.find(p => p.startsWith('TYPE='))?.substring(5)?.toLowerCase() || 'other'
          contact.emails!.push({
            email: value,
            type: emailType as any,
            primary: params.includes('PREF')
          })
          break
        case 'TEL':
          const phoneType = params.find(p => p.startsWith('TYPE='))?.substring(5)?.toLowerCase() || 'other'
          contact.phones!.push({
            number: value,
            type: phoneType as any,
            primary: params.includes('PREF')
          })
          break
        case 'ORG':
          contact.organization = value
          break
        case 'TITLE':
          contact.title = value
          break
        case 'NOTE':
          contact.notes = value
          break
        case 'BDAY':
          contact.birthday = value
          break
      }
    }
    
    return contact as Contact
  }

  async generateVCard(contact: Contact): Promise<string> {
    let vcard = 'BEGIN:VCARD\n'
    vcard += 'VERSION:3.0\n'
    vcard += `UID:${contact.uid}\n`
    vcard += `FN:${contact.displayName}\n`
    
    const nameParts = [
      contact.lastName || '',
      contact.firstName || '',
      contact.middleName || '',
      contact.prefix || '',
      contact.suffix || ''
    ]
    vcard += `N:${nameParts.join(';')}\n`
    
    if (contact.organization) vcard += `ORG:${contact.organization}\n`
    if (contact.title) vcard += `TITLE:${contact.title}\n`
    if (contact.birthday) vcard += `BDAY:${contact.birthday}\n`
    if (contact.notes) vcard += `NOTE:${contact.notes}\n`
    
    for (const email of contact.emails) {
      const type = email.type.toUpperCase()
      const pref = email.primary ? ';PREF' : ''
      vcard += `EMAIL;TYPE=${type}${pref}:${email.email}\n`
    }
    
    if (contact.phones) {
      for (const phone of contact.phones) {
        const type = phone.type.toUpperCase()
        const pref = phone.primary ? ';PREF' : ''
        vcard += `TEL;TYPE=${type}${pref}:${phone.number}\n`
      }
    }
    
    if (contact.addresses) {
      for (const address of contact.addresses) {
        const type = address.type.toUpperCase()
        const pref = address.primary ? ';PREF' : ''
        const addrParts = [
          '', // PO Box
          '', // Extended address
          address.street || '',
          address.city || '',
          address.state || '',
          address.postalCode || '',
          address.country || ''
        ]
        vcard += `ADR;TYPE=${type}${pref}:${addrParts.join(';')}\n`
      }
    }
    
    vcard += 'END:VCARD\n'
    return vcard
  }

  private async mapContactFromDB(row: any): Promise<Contact> {
    const client = await this.db.connect()
    try {
      // Get emails
      const emailsResult = await client.query(`
        SELECT email, type, is_primary FROM contact_emails WHERE contact_id = $1
      `, [row.id])
      
      const emails: ContactEmail[] = emailsResult.rows.map(emailRow => ({
        email: emailRow.email,
        type: emailRow.type,
        primary: emailRow.is_primary
      }))
      
      // Get phones
      const phonesResult = await client.query(`
        SELECT number, type, is_primary FROM contact_phones WHERE contact_id = $1
      `, [row.id])
      
      const phones: ContactPhone[] = phonesResult.rows.map(phoneRow => ({
        number: phoneRow.number,
        type: phoneRow.type,
        primary: phoneRow.is_primary
      }))
      
      // Get addresses
      const addressesResult = await client.query(`
        SELECT street, city, state, postal_code, country, type, is_primary 
        FROM contact_addresses WHERE contact_id = $1
      `, [row.id])
      
      const addresses: ContactAddress[] = addressesResult.rows.map(addrRow => ({
        street: addrRow.street,
        city: addrRow.city,
        state: addrRow.state,
        postalCode: addrRow.postal_code,
        country: addrRow.country,
        type: addrRow.type,
        primary: addrRow.is_primary
      }))
      
      return {
        id: row.id,
        uid: row.uid,
        displayName: row.display_name,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        nickname: row.nickname,
        prefix: row.prefix,
        suffix: row.suffix,
        emails,
        phones,
        addresses,
        organization: row.organization,
        title: row.title,
        department: row.department,
        birthday: row.birthday,
        notes: row.notes,
        photo: row.photo,
        created: row.created,
        updated: row.updated
      }
    } finally {
      client.release()
    }
  }
}
