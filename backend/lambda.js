// The backend on AWS Lambda (ADR-0005), behind StoryShaped's Amplify app, which
// forwards /api/*, /auth/* and /oauth/* to the function URL (DEPLOY-MAP.md), so
// the site calls its own address. The same Express app as the local server
// (server/server.js), adapted to Lambda's events by serverless-http.
//
// Settings, by name, on the function: DATABASE_URL, EOTM_SITE_API,
// ETSY_CLIENT_ID, ETSY_CLIENT_SECRET, ETSY_REDIRECT_URI, EBAY_CLIENT_ID,
// EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI, EBAY_ENVIRONMENT.

import serverless from 'serverless-http'
import app from './server/server.js'

export const handler = serverless(app)
