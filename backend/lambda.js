// The backend on AWS Lambda (ADR-0005), reached through each Amplify branch's
// VITE_API_URL (the function URL) today, and later through the site's own
// /api, /auth and /oauth rewrites (DEPLOY-MAP.md). The same Express app as the
// local server (server/server.js), adapted to Lambda's events by serverless-http.
//
// The database connection is read at cold start from Parameter Store by name
// (DATABASE_PARAM, a SecureString; ADR-0009), so it is never copied into a
// setting. DATABASE_URL, when set, wins, for running this file elsewhere.
//
// Settings, by name, on the function: DATABASE_PARAM, EOTM_SITE_API,
// ETSY_CLIENT_ID, ETSY_CLIENT_SECRET, ETSY_REDIRECT_URI, EBAY_CLIENT_ID,
// EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI, EBAY_ENVIRONMENT.

import serverless from 'serverless-http'

if (!process.env.DATABASE_URL && process.env.DATABASE_PARAM) {
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
    const { Parameter } = await new SSMClient({}).send(new GetParameterCommand({ Name: process.env.DATABASE_PARAM, WithDecryption: true }))
    process.env.DATABASE_URL = Parameter.Value
  } catch (err) {
    // No database: the routes that need one answer 503, the rest still work.
    console.error(`[lambda] reading ${process.env.DATABASE_PARAM} failed:`, err.message)
  }
}

// After the connection is known: utils/db.js reads it when first imported.
const { default: app } = await import('./server/server.js')
export const handler = serverless(app)
