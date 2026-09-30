// src/lib/builtInPages.js
// The site's pages as shipped, in the shape of the console's `page` documents:
// a title and a list of sections, each one of the schema's components (blocks
// in the console's schema/sites/storyshaped.json). A page renders from its
// console document when there is one (components/SitePage.jsx) and from here
// when there is not, and scripts/seed-editor.mjs copies these into the console.
// Plain data, no React or bundled assets, so Node can import it. The sections
// below are written in the narrower shapes they were first built in and turned
// into Cards on export (lib/cards.js, toCard), keeping the copy easy to read.

import { toCard } from './cards.js'
//
// Home's section ids are the keys its Page layout for "/" already arranges
// (hero, believe, story, jewelry, makers), so that layout still applies.

// Whitney's seven values, copy verbatim from the notes doc (board #16). The
// heading is "What We Believe", not the "Our Values" the board item was opened
// under; raised under board #41.
const VALUES = [
  ['Preserving History', 'Every piece of uranium glass carries a story. We are committed to the stewardship of an extraordinary artistic heritage, preserving it for those who will discover it next.'],
  ['Education Through Research', 'Knowledge should be shared. Through ongoing research, historical documentation, and educational resources, we strive to be the world’s most trusted source for uranium glass jewelry.'],
  ['Honoring the Material', 'Remarkable materials deserve exceptional craftsmanship. Every piece is thoughtfully designed and handcrafted to become tomorrow’s heirloom.'],
  ['Restoration & Renewal', 'Some stories aren’t finished yet. Through careful repair and restoration, we breathe new life into vintage and antique uranium glass jewelry, honoring the hands that created it so it can continue to be loved across generations.'],
  ['Authenticity', 'We believe every piece deserves an honest story. From age and origin to materials and craftsmanship, we are committed to representing every piece with accuracy and integrity.'],
  ['Curiosity & Discovery', 'Whether it’s an overlooked antique necklace, a forgotten Czech bead, or a rare cabochon, we believe the thrill of discovery is part of the journey. We are always searching for remarkable pieces and the stories they carry.'],
  ['Caring for Every Collector', 'Whether you’re purchasing your first glowing pendant or your hundredth antique bead, we want every interaction to be welcoming, educational, and genuinely enjoyable.'],
]

const home = {
  title: 'Home',
  sections: [
    {
      _id: 'hero', _type: 'hero',
      logo: null,
      tagline: 'The World’s Largest Resource for Uranium Glass Jewelry',
      buttons: [
        { _id: 'hero-learn', label: 'Learn about Uranium Glass', url: '/library' },
        { _id: 'hero-shop', label: 'Shop the Collection', url: '/shop' },
      ],
      photos: [],
      credit: 'Created by Whitney Granger, internationally recognized uranium glass jewelry artist and historian',
    },
    {
      _id: 'believe', _type: 'values',
      heading: 'What We Believe',
      items: VALUES.map(([title, text], i) => ({ _id: `value-${i + 1}`, title, text })),
    },
    // Her Our Story draft trails off mid-word on a link ("More on Whitney's
    // personal journey here (hy"), so that fragment is not rendered; the link
    // points at Meet the Artist, the assumed target (board #40).
    {
      _id: 'story', _type: 'prose',
      heading: 'Our Story',
      body:
        '<p>Long before StoryShaped Studios existed, artisans were crafting jewelry from uranium glass. ' +
        'Whitney discovered that forgotten history in 2018 through a Neiger Brothers necklace, and it was love at first sight. ' +
        'Thousands of hours of research, an international community of collectors, and a passion for preserving these remarkable ' +
        'artifacts eventually led her to teach herself jewelry making during the 2020 pandemic. What began as a personal fascination ' +
        'grew into the world’s leading authority on uranium glass jewelry and beads. Today, StoryShaped Studios preserves the history ' +
        'of uranium glass jewelry while creating heirloom-quality pieces that carry that story forward.</p>',
      link: { label: 'More on Whitney’s personal journey', url: '/meet-the-artist' },
    },
    {
      _id: 'jewelry', _type: 'prose',
      heading: 'Our Jewelry',
      body:
        '<p>Every StoryShaped Studios piece begins with genuine uranium glass, from rare antique treasures to newly crafted Czech glass. ' +
        'Whether creating an original design or carefully restoring a historic piece, our work is guided by a deep respect for the history, ' +
        'artistry, and enduring beauty of uranium glass.</p>',
      link: { label: '', url: '' },
    },
    {
      _id: 'makers', _type: 'prose',
      heading: 'A Space for Makers',
      body:
        '<p>StoryShaped Studios is the largest retailer of uranium glass beads in the world, with over 200 unique bead designs both vintage ' +
        'and newly made. All of our beads are the highest quality Czech glass.</p>' +
        '<p>We also specialize in uranium glass cabochons, pendants, and faceted gems.</p>',
      link: { label: '', url: '' },
    },
  ],
}

const portrait = (file, i) => ({ src: `/assets/artist/${file}`, alt: `Whitney Granger, creator of StoryShaped Studios (${i + 1})` })

const meetTheArtist = {
  title: 'Meet the Artist',
  sections: [
    {
      _id: 'portraits', _type: 'portraits',
      eyebrow: 'The Hands Behind the Glow',
      heading: 'Meet the Artist',
      photos: ['1000074267.jpg', '1000074325.jpg', '1000074345.jpg'].map(portrait),
    },
    {
      _id: 'story', _type: 'artistStory',
      body:
        '<p>I specialize in handmade <b>uranium glass</b> jewelry as well as the repair and restoration of antique and vintage uranium glass jewelry pieces. ' +
        'I am passionate about uranium glass and its wildly fascinating history. My knowledge is the result of thousands of hours of research, travel, and ' +
        'identification over the past 5 years. I am totally dedicated to furthering the knowledge and appreciation of this unusual type of jewelry.</p>' +
        '<p>I came to Colorado several years ago and love my new home more every day, although many miles away from the cornfields of central Illinois ' +
        'where I grew up. I received a degree in Psychology with a minor in English Literature, and I worked for 10 years alongside adults with intellectual ' +
        'and developmental disabilities in residential settings. I also ran an international non-profit agency dedicated to assisting countries working toward ' +
        'the deinstitutionalization of their disabled citizens.</p>' +
        '<p>In 2020 with the onset of the pandemic, my search for a career change intersected with being quarantined. I had always loved jewelry, and this was ' +
        'the perfect opportunity to try my hand at it. Today I am the largest uranium glass bead supplier in the US. I am world-renowned as an expert on all ' +
        'things uranium glass jewelry. I specialize in sourcing old art deco cabochons, faceted glass gems, old glass beads, and vintage and antique jewelry ' +
        'items. I travel the world to find these historic pieces. I incorporate contemporary glass components from the Czech Republic as well.</p>' +
        '<p>I am also a rare book collector, a musician and multi-instrumentalist, the wife of a clever and magical woodland elf, and the devoted subject of ' +
        'two feline overlords.</p>' +
        '<p>It is a true honor to promote the love and appreciation I have for uranium glass among jewelry collectors and I am proud to preserve and further ' +
        'the concept of an <b>‘Eternal Glow’</b>.</p>',
      signature: 'Whitney Granger',
      signatureTitle: 'Creator and Designer of StoryShaped Studios',
      links: [
        { _id: 'press-house-beautiful', title: 'My interview with House Beautiful magazine', url: 'https://www.housebeautiful.com/design-inspiration/a45459335/uranium-glass-collecting-radioactive-glassware/' },
        { _id: 'press-denver-post', title: 'My interview with The Denver Post', url: 'https://www.denverpost.com/2023/10/26/uranium-glass-jewelry-halloween-colorado-collector-for-sale/' },
      ],
    },
    {
      _id: 'cabinet', _type: 'framedPhoto',
      image: { src: '/assets/artist/cabinet.jpg', alt: 'Whitney’s uranium glass jewelry cabinet, glowing' },
      caption: '',
    },
  ],
}

// The Library's page: its first Card is the heading over the index
// (pages/Library.jsx); the entries themselves are Library entry documents.
const library = {
  title: 'Library',
  sections: [
    {
      _id: 'intro', _type: 'card', eyebrow: 'Knowledge Base', heading: 'Uranium Glass Library',
      body: '<p>On identifying, dating, and caring for uranium glass jewelry. Pick an entry to begin.</p>',
      images: [], links: [], byline: '', bylineNote: '', look: 'text',
    },
  ],
}

// The Shop, until selling here is built: where the pieces are listed now.
const shop = {
  title: 'Shop',
  sections: [
    {
      _id: 'intro', _type: 'card', eyebrow: 'Shop', heading: 'Shop the Collection',
      body: '<p>Our pieces are listed on Etsy and eBay while the shop here is being built.</p>',
      images: [],
      links: [
        { _id: 'shop-etsy', title: 'StoryShaped Studios on Etsy', url: 'https://www.etsy.com/shop/storyshapedstudios/?etsrc=sdt' },
        { _id: 'shop-ebay', title: 'StoryShaped Studios on eBay', url: 'https://www.ebay.com/str/storyshapedstudios' },
      ],
      byline: '', bylineNote: '', look: 'text',
    },
  ],
}

const asCards = (page) => ({ ...page, sections: page.sections.map(toCard) })

// By page slug; Home's is "home" and it shows at "/".
export const BUILT_IN_PAGES = { home: asCards(home), 'meet-the-artist': asCards(meetTheArtist), library, shop }

// The theme as shipped: Home.css's colours per mode (the console's `theme`;
// blank fonts keep Poiret One and the body face). Seeded so the editor shows
// real values rather than blanks.
export const BUILT_IN_THEME = {
  headingFont: '',
  bodyFont: '',
  blacklight: { background: '#060806', accent: '#00fb00', text: '#d9f2d9', muted: '#72ca72', glow: '', glowStrength: 100, glowSpread: 100, glowPulse: '' },
  daylight: { background: '#0f1512', accent: '#d9ff6b', text: '#eef2d9', muted: '#b3ca73', glow: '', glowStrength: 20, glowSpread: 100, glowPulse: '' },
}
