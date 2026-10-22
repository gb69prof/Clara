// Public configuration only. Never put API keys or access tokens in this file.
export const config = Object.freeze({
  // Same-origin server route, e.g. './api/chat'. null keeps the explicit demo mode.
  assistantEndpoint: null,
  requestTimeoutMs: 30000,
  // Existing application routes can be connected independently of the home.
  areas: { lessons: null, materials: null, projects: null },
});
