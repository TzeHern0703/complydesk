import type { EmailMessage, EmailAttachment, EmailFilter } from '../types'

let tokenClient: google.accounts.oauth2.TokenClient | null = null

declare global {
  interface Window {
    google: typeof google
    onGoogleScriptLoad?: () => void
  }
}

export async function loadGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

export async function requestGmailToken(
  clientId: string,
  onToken: (token: string, expiry: number) => void,
  onError: (err: string) => void
): Promise<void> {
  await loadGIS()
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    callback: (response: google.accounts.oauth2.TokenResponse) => {
      if (response.error) {
        onError(response.error)
        return
      }
      const expiry = Date.now() + (Number(response.expires_in) * 1000)
      onToken(response.access_token, expiry)
    },
  })
  tokenClient.requestAccessToken()
}

async function gmailFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gmail API error: ${res.status}`)
  }
  return res.json()
}

export function buildGmailQuery(filters: EmailFilter[]): string {
  const keywords = filters.filter((f) => f.type === 'keyword').map((f) => f.value)
  const senders = filters.filter((f) => f.type === 'sender').map((f) => `from:${f.value}`)
  const excludeSenders = filters.filter((f) => f.type === 'exclude-sender').map((f) => `-from:${f.value}`)
  const excludeKeywords = filters.filter((f) => f.type === 'exclude-keyword').map((f) => `-"${f.value}"`)

  let query = ''
  if (keywords.length > 0) {
    query += `(${keywords.map((k) => `subject:${k}`).join(' OR ')})`
  }
  if (senders.length > 0) {
    query += (query ? ' OR ' : '') + `(${senders.join(' OR ')})`
  }
  if (excludeSenders.length > 0) {
    query += ' ' + excludeSenders.join(' ')
  }
  if (excludeKeywords.length > 0) {
    query += ' ' + excludeKeywords.join(' ')
  }

  return query || 'in:inbox'
}

function decodeBase64(data: string): string {
  return atob(data.replace(/-/g, '+').replace(/_/g, '/'))
}

function extractBodyFromParts(parts: any[]): { html?: string; text?: string } {
  let html: string | undefined
  let text: string | undefined

  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64(part.body.data)
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64(part.body.data)
    } else if (part.parts) {
      const sub = extractBodyFromParts(part.parts)
      html = html ?? sub.html
      text = text ?? sub.text
    }
  }
  return { html, text }
}

function extractAttachmentsFromParts(parts: any[], messageId: string): EmailAttachment[] {
  const attachments: EmailAttachment[] = []
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        messageId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size ?? 0,
      })
    }
    if (part.parts) {
      attachments.push(...extractAttachmentsFromParts(part.parts, messageId))
    }
  }
  return attachments
}

function parseEmail(raw: any): EmailMessage {
  const headers: Record<string, string> = {}
  for (const h of raw.payload?.headers ?? []) {
    headers[h.name.toLowerCase()] = h.value
  }

  const fromHeader = headers['from'] ?? ''
  const emailMatch = fromHeader.match(/<(.+?)>/)
  const fromEmail = emailMatch ? emailMatch[1] : fromHeader
  const fromName = emailMatch ? fromHeader.replace(/<.+?>/, '').trim() : fromHeader

  const parts = raw.payload?.parts ?? []
  const body = extractBodyFromParts(parts)
  if (!body.html && !body.text && raw.payload?.body?.data) {
    const decoded = decodeBase64(raw.payload.body.data)
    if (raw.payload.mimeType === 'text/html') body.html = decoded
    else body.text = decoded
  }

  const attachments = extractAttachmentsFromParts(parts, raw.id)

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: headers['subject'] ?? '(no subject)',
    from: fromName.replace(/^["']|["']$/g, ''),
    fromEmail,
    date: new Date(Number(headers['date'] ? new Date(headers['date']).getTime() : raw.internalDate)),
    snippet: raw.snippet ?? '',
    hasAttachments: attachments.length > 0,
    attachments,
    bodyHtml: body.html,
    bodyText: body.text,
    isProcessed: false,
    fetchedAt: new Date(),
    labelIds: raw.labelIds ?? [],
  }
}

export async function fetchEmails(
  token: string,
  filters: EmailFilter[],
  maxResults = 50
): Promise<EmailMessage[]> {
  const q = buildGmailQuery(filters)
  const listRes = await gmailFetch(
    `/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
    token
  )

  const messages: EmailMessage[] = []
  const ids: string[] = (listRes.messages ?? []).map((m: any) => m.id)

  // Batch fetch with limited concurrency
  const BATCH = 5
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((id) => gmailFetch(`/gmail/v1/users/me/messages/${id}?format=full`, token))
    )
    for (const raw of results) {
      messages.push(parseEmail(raw))
    }
    // Small delay to avoid rate limit
    if (i + BATCH < ids.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return messages
}

export async function fetchAttachmentData(
  token: string,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const res = await gmailFetch(
    `/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    token
  )
  return res.data
}
