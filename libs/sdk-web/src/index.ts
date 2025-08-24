export const DOMAIN = 'ceerion.com'
export const HOST = 'mail.ceerion.com'

export interface EmailConfig {
  domain: string
  host: string
}

export const getEmailConfig = (): EmailConfig => ({
  domain: DOMAIN,
  host: HOST
})

export const validateDomain = (hostname: string): boolean => {
  return hostname === HOST || hostname.endsWith(`.${DOMAIN}`)
}
