import cors from 'cors';

/**
 * CORS for Web + optional H5.
 * 微信小程序 wx.request 不走浏览器 CORS，但开发工具/H5 壳需要配置。
 */
export function createCorsMiddleware(isProd: boolean) {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!isProd) {
    return cors({ origin: true, credentials: true });
  }

  if (!configured?.length) {
    return cors({
      origin: true,
      credentials: true,
    });
  }

  return cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (configured.includes(origin) || configured.includes('*')) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
