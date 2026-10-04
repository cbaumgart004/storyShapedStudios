// src/components/socials.js
// Single source of truth for the studio's social/marketplace links + icons.
// Shared by the top social strip (SiteHeader) and the footer (SiteFooter).

import etsyIcon from '@/assets/coming-soon/etsy.png'
import ebayIcon from '@/assets/coming-soon/ebay.png'
import facebookIcon from '@/assets/coming-soon/facebook.png'
import instagramIcon from '@/assets/coming-soon/instagram.png'

// By the `icon` a Site header and footer entry names (the console's siteSettings).
export const ICONS = { etsy: etsyIcon, ebay: ebayIcon, facebook: facebookIcon, instagram: instagramIcon }

export const socials = [
  { href: 'https://www.etsy.com/shop/storyshapedstudios/?etsrc=sdt', icon: etsyIcon, label: 'Etsy' },
  { href: 'https://www.ebay.com/str/storyshapedstudios', icon: ebayIcon, label: 'eBay' },
  { href: 'https://www.facebook.com/storyshapedstudios/', icon: facebookIcon, label: 'Facebook' },
  { href: 'https://www.instagram.com/storyshaped_studios/?hl=en', icon: instagramIcon, label: 'Instagram' },
]

// Social-only subset for the band under the nav: Whitney's notes ask for
// Facebook + Instagram there, no marketplace logos. The footer still shows the
// full `socials` list, Etsy/eBay included.
export const connectSocials = socials.filter(
  (s) => s.label === 'Facebook' || s.label === 'Instagram'
)

// The links from the console's Site header and footer when it has any, in the
// built-in shape ({ href, icon, label }); `band` keeps only those shown under
// the menu.
export function socialsFrom(settings, { band = false } = {}) {
  const list = settings?.socials?.filter((s) => s.url && s.label)
  if (!list?.length) return band ? connectSocials : socials
  // `row` is the console's own entry, for fields the owner added to it (a photo
  // in place of the icon, a Style): components/Extras.jsx.
  return list.filter((s) => !band || s.inBand).map((s) => ({ href: s.url, icon: ICONS[s.icon] ?? null, label: s.label, row: s }))
}
