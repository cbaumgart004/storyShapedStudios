// src/components/socials.js
// Single source of truth for the studio's social/marketplace links + icons.
// Shared by the top social strip (SiteHeader) and the footer (SiteFooter).

import etsyIcon from '@/assets/coming-soon/etsy.png'
import ebayIcon from '@/assets/coming-soon/ebay.png'
import facebookIcon from '@/assets/coming-soon/facebook.png'
import instagramIcon from '@/assets/coming-soon/instagram.png'

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
