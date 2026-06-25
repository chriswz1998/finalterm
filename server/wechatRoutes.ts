import { Router, type Request, type Response } from 'express';
import {
  exchangeWechatCode,
  isWechatConfigured,
  requireWechatAuth,
  signWechatToken,
  verifyWechatToken,
  extractBearerToken,
} from './wechatAuth.js';

export function createWechatRouter() {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({
      configured: isWechatConfigured(),
      loginPath: '/api/wechat/login',
      sessionPath: '/api/wechat/session',
    });
  });

  router.post('/login', async (req, res) => {
    try {
      if (!isWechatConfigured()) {
        res.status(503).json({
          message: '微信登录未配置。请在 .env.local 设置 WECHAT_APPID 与 WECHAT_APPSECRET。',
        });
        return;
      }

      const { code } = req.body as { code?: string };
      if (!code?.trim()) {
        res.status(400).json({ message: '缺少 code（由小程序 wx.login 获取）' });
        return;
      }

      const { openid, unionid } = await exchangeWechatCode(code.trim());
      const token = signWechatToken(openid);

      res.json({
        token,
        expiresIn: 7 * 24 * 3600,
        user: {
          openid,
          unionid: unionid ?? null,
        },
      });
    } catch (error) {
      console.error('[wechat/login]', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : '微信登录失败',
      });
    }
  });

  router.get('/session', (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ message: '未登录' });
      return;
    }
    const session = verifyWechatToken(token);
    if (!session) {
      res.status(401).json({ message: '登录已过期' });
      return;
    }
    res.json({ ok: true, openid: session.openid });
  });

  router.get('/me', requireWechatAuth, (req: Request, res: Response) => {
    const user = (req as Request & { wechatUser?: { openid: string } }).wechatUser;
    res.json({ openid: user?.openid });
  });

  return router;
}
