// server/utils/mail.js
// Sends plain-text email through Amazon SES (v2 SendEmail). The Lambda's role
// needs ses:SendEmail on the sending identity (DEPLOY-MAP.md, "Email").
//
// Settings, by name: MAIL_FROM (default below; its domain must be a verified
// SES identity), MAIL_REGION (default us-east-1).

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

const DEFAULT_FROM = 'StoryShaped Studios <info@storyshapedstudios.com>'

export class MailError extends Error {}

export function createMailer({ client, from = process.env.MAIL_FROM || DEFAULT_FROM } = {}) {
  let ses = client
  return {
    async send({ to, subject, text }) {
      ses ??= new SESv2Client({ region: process.env.MAIL_REGION || 'us-east-1' })
      try {
        await ses.send(new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          ReplyToAddresses: [from],
          Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
        }))
      } catch (err) {
        console.error('[mail] SES send failed:', err.name, err.message)
        throw new MailError(err.message)
      }
    },
  }
}

export const mailer = createMailer()
