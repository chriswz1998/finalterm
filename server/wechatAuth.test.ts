import { describe, expect, it } from 'vitest';
import { signWechatToken, verifyWechatToken } from '../server/wechatAuth.ts';

describe('wechatAuth JWT', () => {
  it('signs and verifies token', () => {
    process.env.WECHAT_JWT_SECRET = 'test-secret-at-least-32-characters-long';
    const token = signWechatToken('o-test-openid', 3600);
    const session = verifyWechatToken(token);
    expect(session?.openid).toBe('o-test-openid');
  });

  it('rejects tampered token', () => {
    process.env.WECHAT_JWT_SECRET = 'test-secret-at-least-32-characters-long';
    const token = signWechatToken('o-test-openid', 3600);
    const bad = token.slice(0, -1) + 'x';
    expect(verifyWechatToken(bad)).toBeNull();
  });
});
