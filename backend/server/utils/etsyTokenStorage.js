// server/utils/etsyTokenStorage.js
// The Etsy OAuth token, kept by utils/tokens.js (Neon, or a file locally).

import { saveToken as save, loadToken as load } from './tokens.js'

export const saveToken = (token) => save('etsy', token)
export const loadToken = () => load('etsy')
