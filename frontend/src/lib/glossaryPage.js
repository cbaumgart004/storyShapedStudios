// src/lib/glossaryPage.js
// The Glossary as shipped, in the shape of the console's Reference Page Layout
// (referencePage in the console's schema/sites/storyshaped.json). The Glossary
// page renders it until a Reference Page Layout for /glossary exists, and
// scripts/import-glossary.mjs copies it into the console. No React or CSS here,
// so Node can import it.

import { GLOSSARY_TERMS, CATEGORY_ORDER } from '../data/glossaryTerms.js'

// Curated jump-in points into the Library. Each string is the EXACT Library
// heading; slugify() turns it into the same anchor the Library page assigns.
export const LIBRARY_INDEX = [
  {
    group: 'Start here',
    items: [
      'What is uranium glass?',
      'Why does uranium glass jewelry matter?',
      'Is uranium glass still made?',
    ],
  },
  {
    group: 'Is it safe?',
    items: [
      'Is uranium glass radioactive?',
      'Is wearing uranium glass safe?',
      'Is uranium the same thing as radium? Have you heard of the Radium Girls?',
    ],
  },
  {
    group: 'Identifying & hunting',
    items: [
      'Are your pieces real uranium glass?',
      'What kind of blacklight do I use when I go hunting?',
      'Should I use a Geiger counter to identify uranium glass?',
      'Which Geiger counter should I get?',
      'How do I know if a gems or beads in a piece of jewelry are made of glass?',
    ],
  },
  {
    group: 'Dating & makers',
    items: [
      'How can I date a piece of uranium glass jewelry?',
      'How do I identify the maker of my vintage uranium glass jewelry pieces?',
      'How old are my uranium glass beads?',
    ],
  },
  {
    group: 'Caring for your piece',
    items: [
      'How do I care for my uranium glass jewelry?',
      'How do I determine my ring size?',
    ],
  },
]

export const BUILT_IN = {
  title: 'Glossary of Terms',
  path: '/glossary',
  eyebrow: 'Reference',
  intro: '',
  sections: CATEGORY_ORDER.map((heading) => ({
    heading,
    terms: GLOSSARY_TERMS.filter((t) => t.category === heading).map((t) => ({
      term: t.term,
      definition: t.def,
      details: (t.sub ?? []).map((d) => ({ label: d.label, text: d.text })),
      sources: (t.links ?? []).map((url) => ({ title: '', url })),
    })),
  })),
  libraryIndex: LIBRARY_INDEX.map((g) => ({ group: g.group, entries: g.items.map((title) => ({ title })) })),
}
