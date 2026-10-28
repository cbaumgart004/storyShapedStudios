// server/utils/customers.js
// The customer list the Forms page offers when a name is typed on an order.
// One row per customer, matched on name ignoring case and outer spaces. A new
// name on an order is saved here only when the owner says yes (Forms.jsx).
//
// Takes a pg Pool (or anything with query()), so the tests run the same SQL
// against PGlite.

export class CustomerError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    company     TEXT,
    email       TEXT,
    phone       TEXT,
    bill        TEXT,
    ship        TEXT,
    created_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS customers_name_key ON customers (lower(btrim(name)))`

let ready = null
function ensureTable(db) {
  ready ??= db.query(SCHEMA).catch((err) => {
    ready = null // try again on the next request
    throw err
  })
  return ready
}
export function resetCustomerTableForTests() { ready = null }

const FIELDS = ['company', 'email', 'phone', 'bill', 'ship']
const text = (v) => String(v ?? '').trim() || null

export function createCustomers(db) {
  return {
    list: async () => {
      await ensureTable(db)
      const { rows } = await db.query('SELECT * FROM customers ORDER BY lower(name)')
      return rows
    },

    // 409 when the name is already on the list.
    create: async (input = {}, by = null) => {
      await ensureTable(db)
      const name = text(input.name)
      if (!name) throw new CustomerError(400, 'A customer name is required.')
      try {
        const { rows: [c] } = await db.query(
          `INSERT INTO customers (name, ${FIELDS.join(', ')}, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [name, ...FIELDS.map((f) => text(input[f])), by])
        return c
      } catch (err) {
        if (err.code === '23505' || /unique|duplicate/i.test(err.message)) throw new CustomerError(409, `${name} is already a customer.`)
        throw err
      }
    },
  }
}
