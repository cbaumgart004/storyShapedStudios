// src/lib/librarySlug.js
// Shared slug generator for library article anchors. Used by the Library page
// (to build each entry's id) and by the Glossary index (to link into those
// entries via /library#<slug>). Keeping one implementation guarantees the two
// stay in sync — a glossary link only lands on the right heading if its slug is
// byte-for-byte identical to the id the Library assigns.
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
