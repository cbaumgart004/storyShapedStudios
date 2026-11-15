// server/marketplace/square.js
// Square, ready for Whitney's account: off until its settings are set, and
// read only for now (it checks the account and its locations; it sells and
// counts nothing yet). In-person and card sales are the later use: a Square
// sale would come into stock the way an Etsy receipt does (sync.pullSales).
//
// Settings, by name, on the function: SQUARE_ACCESS_TOKEN (from the Square
// Developer dashboard, Credentials), SQUARE_LOCATION_ID (optional: without it
// the account's first active location), SQUARE_ENVIRONMENT (sandbox, the
// default, or production). The token is never logged or returned.

const BASE = { production: 'https://connect.squareup.com', sandbox: 'https://connect.squareupsandbox.com' }
const VERSION = '2024-10-17'

export function createSquare({ env = process.env, fetchImpl = (...a) => fetch(...a) } = {}) {
  const environment = env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
  const configured = () => Boolean(env.SQUARE_ACCESS_TOKEN)

  const call = async (path) => {
    if (!configured()) throw new Error('Square is not set up: SQUARE_ACCESS_TOKEN is not set.')
    const res = await fetchImpl(`${BASE[environment]}${path}`, {
      headers: { authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'square-version': VERSION, accept: 'application/json' },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Square ${path}: ${res.status} ${body.errors?.[0]?.detail ?? ''}`.trim())
    return body
  }

  return {
    environment,
    configured,
    // Read only: the account's locations, and which one sales would use.
    check: async () => {
      const { locations = [] } = await call('/v2/locations')
      const active = locations.filter((l) => l.status === 'ACTIVE')
      const chosen = env.SQUARE_LOCATION_ID ? locations.find((l) => l.id === env.SQUARE_LOCATION_ID) : active[0]
      return {
        environment,
        locations: locations.map((l) => ({ id: l.id, name: l.name, status: l.status })),
        location: chosen ? { id: chosen.id, name: chosen.name } : null,
        problem: env.SQUARE_LOCATION_ID && !chosen ? `SQUARE_LOCATION_ID is not one of this account's locations.` : null,
      }
    },
  }
}
