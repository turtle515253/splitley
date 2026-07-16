import { describe, expect, it } from 'vitest';
import { NATIVE_OAUTH_REDIRECT_URL, parseOAuthCallback } from './oauth';

describe('parseOAuthCallback', () => {
  it('accepts tokens returned in the URL hash', () => {
    expect(parseOAuthCallback(
      'splitley://auth/callback#access_token=access&refresh_token=refresh',
    )).toEqual({
      ok: true,
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('returns provider errors', () => {
    expect(parseOAuthCallback(
      'splitley://auth/callback?error=access_denied&error_description=Cancelled',
    )).toEqual({
      ok: false,
      message: 'Cancelled',
    });
  });

  it('rejects unrelated deep links', () => {
    expect(parseOAuthCallback('splitley://groups/123')).toBeNull();
  });

  it('uses the permanent native redirect URL', () => {
    expect(NATIVE_OAUTH_REDIRECT_URL).toBe('splitley://auth/callback');
  });
});
