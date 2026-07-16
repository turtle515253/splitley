import { describe, expect, it } from 'vitest';
import { parseDeepLinkPath } from './deepLink';

describe('parseDeepLinkPath', () => {
  it('maps https group links to router paths', () => {
    expect(parseDeepLinkPath('https://splitley.com/groups/abc-123')).toBe('/groups/abc-123');
    expect(parseDeepLinkPath('https://www.splitley.com/groups/abc-123')).toBe('/groups/abc-123');
    expect(parseDeepLinkPath('https://splitley.com/groups')).toBe('/groups');
  });

  it('maps custom-scheme group links', () => {
    expect(parseDeepLinkPath('splitley://groups/abc-123')).toBe('/groups/abc-123');
  });

  it('ignores trailing slashes', () => {
    expect(parseDeepLinkPath('https://splitley.com/groups/abc-123/')).toBe('/groups/abc-123');
  });

  it('rejects the OAuth callback', () => {
    expect(parseDeepLinkPath('splitley://auth/callback#access_token=x')).toBeNull();
  });

  it('rejects unknown paths and schemes', () => {
    expect(parseDeepLinkPath('https://splitley.com/privacy')).toBeNull();
    expect(parseDeepLinkPath('https://splitley.com/')).toBeNull();
    expect(parseDeepLinkPath('https://splitley.com/groups/abc/extra')).toBeNull();
    expect(parseDeepLinkPath('ftp://splitley.com/groups/abc')).toBeNull();
    expect(parseDeepLinkPath('not a url')).toBeNull();
  });
});
