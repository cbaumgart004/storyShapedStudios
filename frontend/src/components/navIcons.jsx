// src/components/navIcons.jsx
// The right-hand utility icons in the nav bar (board #9): search, sign in,
// wishlist, cart. Inline SVG rather than image assets so they inherit the UV
// palette through `currentColor` and cost no extra requests.
//
// Line weight and the 24px box match the reference site Whitney chose. Order is
// hers too: search, account, wishlist, bag.

import React from 'react'

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

const AccountIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
  </svg>
)

const WishlistIcon = () => (
  <svg {...base}>
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.9a4.1 4.1 0 0 1 7.5 2.7c0 5-7.5 9.4-7.5 9.4z" />
  </svg>
)

const CartIcon = () => (
  <svg {...base}>
    <path d="M6 8h12l-1 12H7L6 8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
)

export const utilityIcons = [
  { label: 'Search', Icon: SearchIcon },
  { label: 'Sign in', Icon: AccountIcon },
  { label: 'Wishlist', Icon: WishlistIcon },
  { label: 'Cart', Icon: CartIcon },
]
