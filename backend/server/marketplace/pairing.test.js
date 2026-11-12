import { test } from 'node:test'
import assert from 'node:assert/strict'
import { likeness, titleLikeness } from './pairing.js'

test('a shared SKU or an equal title is a near-certain match; similar wording is a guess', () => {
  const listing = { title: 'Green Vine Uranium Glass Ring', variations: [{ sku: 'R1' }] }
  assert.deepEqual(likeness(listing, { title: 'Something else', variations: [{ sku: 'R1' }] }).by, ['sku'])
  assert.ok(likeness(listing, { title: 'green vine uranium glass ring!', variations: [] }).score >= 0.9)
  const guess = likeness(listing, { title: 'Vintage Green Vine Ring, Uranium Glass, Size 7', variations: [] })
  assert.deepEqual(guess.by, ['words'])
  assert.ok(guess.score > 0 && guess.score < 0.6)
  assert.deepEqual(likeness(listing, { title: 'Blue Moon Pendant', variations: [] }).by, [])
})

test('words every glass listing shares count for nothing', () => {
  assert.equal(titleLikeness('Vintage Uranium Glass', 'Uranium Glass Vintage Handmade'), 0)
})
