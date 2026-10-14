// =====================================================================
// js/api.js — Touchless HMS Universal Adaptive API Client
// Automatically handles:
//  1. Apache on Port 80 (with or without mod_rewrite)
//  2. Root directory or any subfolder (e.g. /touchless-hopital/ or /touchless_hms/)
//  3. PHP Built-in Server (php -S localhost:3000 router.php)
//  4. Node.js server (node server.js)
// Kuwait University — Graduation Project 2026
// =====================================================================

(function (window) {
  'use strict';

  // Compute base directory of current web page
  // e.g. "http://localhost/touchless-hopital/login.html" -> "/touchless-hopital/"
  // e.g. "http://localhost/login.html" -> "/"
  function getBasePath() {
    const path = window.location.pathname;
    const lastSlash = path.lastIndexOf('/');
    return lastSlash >= 0 ? path.substring(0, lastSlash + 1) : '/';
  }

  // Canonical mapping from REST path to direct PHP script
  const ROUTE_MAP = {
    '/api/auth/login': 'api/auth.php?action=login',
    '/api/auth/register': 'api/auth.php?action=register',
    '/api/departments': 'api/departments.php',
    '/api/doctors': 'api/doctors.php',
    '/api/appointments': 'api/appointments.php',
    '/api/prescriptions': 'api/prescriptions.php',
    '/api/vitals': 'api/vitals.php',
    '/api/patients': 'api/patients.php'
  };

  /**
   * Resolves an API endpoint into a bulletproof URL.
   * Priority: direct .php script in the local project directory.
   */
  function resolveDirectUrl(endpoint) {
    const base = getBasePath();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const [pathPart, queryPart] = cleanEndpoint.split('?');

    // 1. Direct route mapping
    if (ROUTE_MAP[pathPart]) {
      const target = ROUTE_MAP[pathPart];
      const separator = target.includes('?') ? '&' : '?';
      return base + target + (queryPart ? separator + queryPart : '');
    }

    // 2. Parameterized appointments / doctors: /api/appointments/:id
    const apptMatch = pathPart.match(/^\/api\/appointments\/(\d+)$/);
    if (apptMatch) {
      const sep = queryPart ? '&' : '';
      return base + `api/appointments.php?id=${apptMatch[1]}` + (queryPart ? '?' + queryPart : '');
    }

    const docMatch = pathPart.match(/^\/api\/doctors\/(\d+)$/);
    if (docMatch) {
      return base + `api/doctors.php?id=${docMatch[1]}` + (queryPart ? '&' + queryPart : '');
    }

    // 3. Fallback: prepend base path without leading slash
    return base + endpoint.replace(/^\//, '');
  }

  /**
   * Resolves the clean rewritten URL.
   */
  function resolveCleanUrl(endpoint) {
    const base = getBasePath();
    return base + endpoint.replace(/^\//, '');
  }

  /**
   * Resilient fetch that tries direct PHP script first,
   * then falls back to clean URL if direct script is not reachable.
   */
  async function apiFetch(endpoint, options = {}) {
    const directUrl = resolveDirectUrl(endpoint);
    try {
      const res = await fetch(directUrl, options);
      if (res.status !== 404) {
        return res;
      }
    } catch (e) {
      console.warn(`[HMS_API] Direct fetch failed for ${directUrl}, attempting clean route fallback:`, e);
    }

    // Fallback attempt: clean URL
    const cleanUrl = resolveCleanUrl(endpoint);
    try {
      const cleanRes = await fetch(cleanUrl, options);
      if (cleanRes.status !== 404) {
        return cleanRes;
      }
    } catch (e) {
      console.warn(`[HMS_API] Clean fetch failed for ${cleanUrl}:`, e);
    }

    // Final attempt: raw endpoint
    return fetch(endpoint, options);
  }

  // Export to window
  window.HMS_API = {
    getBasePath: getBasePath,
    resolveDirectUrl: resolveDirectUrl,
    resolveCleanUrl: resolveCleanUrl,
    fetch: apiFetch
  };

})(window);
