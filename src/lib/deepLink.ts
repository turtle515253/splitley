/**
 * Maps external URLs (email links, App Links) to in-app router paths.
 *
 * Supported:
 *   https://splitley.com/groups/<id>  -> /groups/<id>
 *   https://www.splitley.com/groups   -> /groups
 *   splitley://groups/<id>            -> /groups/<id>
 *
 * Returns null for anything else (including the OAuth callback, which is
 * handled separately by GoogleLoginButton).
 */
export function parseDeepLinkPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let path: string;
  if (parsed.protocol === 'splitley:') {
    // Custom scheme: the first segment lands in `host` (splitley://groups/123)
    path = `/${parsed.host}${parsed.pathname}`;
  } else if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
    path = parsed.pathname;
  } else {
    return null;
  }

  // Normalize trailing slash
  path = path.length > 1 ? path.replace(/\/+$/, '') : path;

  if (path === '/groups' || /^\/groups\/[A-Za-z0-9-]+$/.test(path)) {
    return path;
  }
  return null;
}
