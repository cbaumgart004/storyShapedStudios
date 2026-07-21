// src/lib/api.js
// Base URL for the backend API. In production set VITE_API_URL to the deployed
// backend origin (e.g. https://xxx.up.railway.app); locally it defaults to the
// dev server on port 3000.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
