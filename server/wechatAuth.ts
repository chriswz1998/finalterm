import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const WECHAT_SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';
const DEFAULT_TOKEN_TTL_SEC = 7 * 24 * 3600;

export interface WechatSessionPayload {
  sub: string;
  openid: string;
}

export function isWechatConfigured(): boolean {
  return Boolean(process.env.WECHAT_APPID?.trim() && process.env.WECHAT_APPSECRET?.trim());
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function getJwtSecret(): string {
  const secret = process.env.WECHAT_JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 WECHAT_JWT_SECRET');
  }
  return 'health-link-dev-wechat-jwt-secret';
}

export function signWechatToken(openid: string, ttlSec = DEFAULT_TOKEN_TTL_SEC): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: WechatSessionPayload & { exp: number; iat: number } = {
    sub: openid,
    openid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyWechatToken(token: string): WechatSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as WechatSessionPayload & { exp?: number };
    if (payload.exp != null && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.openid) return null;
    return { sub: payload.sub, openid: payload.openid };
  } catch {
    return null;
  }
}

export async function exchangeWechatCode(code: string): Promise<{ openid: string; unionid?: string }> {
  const appid = process.env.WECHAT_APPID?.trim();
  const secret = process.env.WECHAT_APPSECRET?.trim();
  if (!appid || !secret) {
    throw new Error('未配置 WECHAT_APPID / WECHAT_APPSECRET');
  }

  const url = new URL(WECHAT_SESSION_URL);
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    openid?: string;
    unionid?: string;
    session_key?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.openid) {
    throw new Error(data.errmsg ?? `微信登录失败 (${data.errcode ?? 'unknown'})`);
  }

  return { openid: data.openid, unionid: data.unionid };
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

export function optionalWechatAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    const session = verifyWechatToken(token);
    if (session) {
      (req as Request & { wechatUser?: WechatSessionPayload }).wechatUser = session;
    }
  }
  next();
}

export function requireWechatAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ message: '需要微信小程序登录 token（Authorization: Bearer）' });
    return;
  }
  const session = verifyWechatToken(token);
  if (!session) {
    res.status(401).json({ message: '登录已过期或 token 无效，请重新 wx.login' });
    return;
  }
  (req as Request & { wechatUser?: WechatSessionPayload }).wechatUser = session;
  next();
}
