// server/utils/ebayTokenStorage.js
// The eBay OAuth token, kept by utils/tokens.js (Neon, or a file locally).

import { saveToken as save, loadToken as load } from './tokens.js'

export const saveToken = (token) => save('ebay', token)
export const loadToken = () => load('ebay')
