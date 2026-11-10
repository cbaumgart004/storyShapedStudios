// src/lib/librarySlug.js
// Library slugs, shared by the Library page and the Glossary index.

// An entry's address: the slug the console gives the document, uncut. This is
// what the sitemap lists and what a direct request finds.
export function fullSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// An entry's id, cut to 60 characters. Stored view counts and each entry's
// "Place in contents" use it, so it stays as it is; it is not an address.
export function slugify(text) {
  return fullSlug(text).slice(0, 60)
}

// The page of a Library entry, { slug, id }; an entry from the bundled markdown
// has no document, so no slug.
export const entryPath = (entry) => `/library/${encodeURIComponent(entry.slug ?? entry.id)}`
