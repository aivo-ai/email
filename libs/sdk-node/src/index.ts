export const DOMAIN = 'ceerion.com'
export const HOST = 'mail.ceerion.com'

export interface EmailServerConfig {
  domain: string
  host: string
  port?: number
  ssl?: boolean
}

export const getServerConfig = (): EmailServerConfig => ({
  domain: DOMAIN,
  host: HOST,
  port: 3000,
  ssl: true
})

export const validateServerDomain = (hostname: string): boolean => {
  return hostname === HOST || hostname.endsWith(`.${DOMAIN}`)
}
