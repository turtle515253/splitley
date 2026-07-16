export const NATIVE_OAUTH_REDIRECT_URL = 'splitley://auth/callback';

export type OAuthCallbackResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; message: string };

export function parseOAuthCallback(url: string): OAuthCallbackResult | null {
  const parsed = new URL(url);
  const callbackUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

  if (callbackUrl !== NATIVE_OAUTH_REDIRECT_URL) {
    return null;
  }

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const value = (key: string) => hash.get(key) ?? parsed.searchParams.get(key);
  const error = value('error');

  if (error) {
    return { ok: false, message: value('error_description') ?? error };
  }

  const accessToken = value('access_token');
  if (!accessToken) {
    return { ok: false, message: 'Google sign-in returned no access token.' };
  }

  return {
    ok: true,
    accessToken,
    refreshToken: value('refresh_token') ?? '',
  };
}
