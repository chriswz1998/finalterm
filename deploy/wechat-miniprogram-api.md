# 微信小程序 API 改造清单（个人主体）

> 后端基址示例：`https://api.your-domain.com`（须 **HTTPS + ICP 备案**）

## 一、微信公众平台（个人小程序）

| 步骤 | 操作 |
|------|------|
| 1 | [微信公众平台](https://mp.weixin.qq.com/) 注册 **个人** 类型小程序 |
| 2 | 开发 → 开发管理 → **开发设置** → 记录 **AppID / AppSecret** |
| 3 | 开发 → 开发管理 → **服务器域名** → request 合法域名填 `https://api.your-domain.com` |
| 4 | 设置 → 基本设置 → **服务类目**：优先 **工具 → 信息查询** 或 **生活服务**（避免需医疗资质类目） |
| 5 | 设置 → 用户隐私保护指引 → 填写收集项（见下文「隐私字段」） |
| 6 | 设置 → 基本设置 → 隐私政策链接填 `https://your-domain.com/privacy` |

### 个人主体限制（需知）

- 不可使用微信支付（本 MVP 不涉及）
- 部分类目不可用；**互联网医院 / 在线问诊** 等不可用
- 每日发布次数、用户规模有限制，内测够用

---

## 二、服务端环境变量（`.env.local`）

```bash
# 微信小程序
WECHAT_APPID=wx你的AppID
WECHAT_APPSECRET=你的AppSecret
WECHAT_JWT_SECRET=随机长字符串至少32位

# 生产 CORS（H5 调试 / 未来 WebView 壳）
CORS_ORIGINS=https://your-domain.com,https://servicewechat.com
```

`WECHAT_JWT_SECRET` 生产环境必填，用于签发登录 token。

---

## 三、已实现的 API

### 1. 微信登录

```http
POST /api/wechat/login
Content-Type: application/json

{ "code": "<wx.login 返回的 code>" }
```

**响应：**

```json
{
  "token": "eyJ...",
  "expiresIn": 604800,
  "user": { "openid": "oXXXX", "unionid": null }
}
```

**小程序端示例：**

```javascript
wx.login({
  success: async ({ code }) => {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.your-domain.com/api/wechat/login',
        method: 'POST',
        data: { code },
        success: resolve,
        fail: reject,
      });
    });
    wx.setStorageSync('hl_token', res.data.token);
  },
});
```

### 2. 校验登录态

```http
GET /api/wechat/session
Authorization: Bearer <token>
```

### 3. 配置探测

```http
GET /api/wechat/status
```

### 4. 健康检查（含微信配置状态）

```http
GET /api/health
```

返回字段含 `wechatConfigured: true|false`。

---

## 四、业务 API 调用方式（小程序）

后续请求在 header 带 token（**二期**可对写操作强制登录）：

```javascript
wx.request({
  url: 'https://api.your-domain.com/api/agent/interpret',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + wx.getStorageSync('hl_token'),
  },
  data: { mode: 'summary', /* ... */ },
});
```

| 接口 | 路径 | 说明 |
|------|------|------|
| 视觉 OCR | `POST /api/document/vision-parse` | `{ imageBase64, mimeType }` |
| Agent 摘要 | `POST /api/agent/interpret` | `mode: summary` |
| Agent 单项 | `POST /api/agent/interpret` | `mode: items` |
| RAG 解读 | `POST /api/gemini/interpret-rag` | 主应用同款 |

> PDF：小程序内建议 **拍照/选图 → vision-parse**，不要依赖浏览器 pdfjs。

---

## 五、CORS 说明

| 客户端 | 是否需要 CORS |
|--------|----------------|
| 微信小程序 `wx.request` | **否**（域名白名单即可） |
| 浏览器 H5 / 开发工具部分场景 | **是** |
| App Store Capacitor | 同源或配置 `CORS_ORIGINS` |

生产环境在 `CORS_ORIGINS` 中配置你的 Web 域名；未配置时默认允许所有 Origin（便于先联调，上线建议收紧）。

---

## 六、改造阶段建议

### 阶段 1（当前）

- [x] `POST /api/wechat/login`
- [x] `GET /api/wechat/session`
- [x] CORS 可配置
- [x] `/privacy` 隐私政策页

### 阶段 2（小程序联调）

- [ ] 档案按 `openid` 服务端存储（替换纯 localStorage）
- [ ] Agent / document 路由加 `optionalWechatAuth`，写操作 `requireWechatAuth`
- [ ] 上传大小限制与微信 10MB 对齐
- [ ] 错误码统一（401 / 503）

### 阶段 3（提审）

- [ ] 小程序隐私协议弹窗与后台指引一致
- [ ] 用户注销 / 删除数据入口
- [ ] 内容安全：敏感词过滤（可选 `msgSecCheck`）

---

## 七、隐私保护指引（微信后台填写参考）

| 信息类型 | 用途 | 是否必须 |
|----------|------|----------|
| 微信 openid | 识别用户、隔离档案 | 是 |
| 相册/相机 | 上传体检报告图片 | 用户触发时 |
| 健康指标文本 | AI 解读 | 用户触发时 |
| 设备信息 | 崩溃排查 | 可选 |

隐私政策 URL：`https://your-domain.com/privacy`

---

## 八、联调检查

```bash
# 服务端
curl https://api.your-domain.com/api/wechat/status
curl https://api.your-domain.com/api/health

# 登录（将 CODE 换成真实 wx.login code，5 分钟有效）
curl -X POST https://api.your-domain.com/api/wechat/login \
  -H 'Content-Type: application/json' \
  -d '{"code":"THE_CODE"}'
```

---

## 九、常见错误

| 现象 | 原因 |
|------|------|
| `request:fail url not in domain list` | 未在小程序后台配置合法域名 |
| `code been used` | code 只能用一次，需重新 `wx.login` |
| `401 invalid appsecret` | AppSecret 错误或泄露后重置 |
| SSL 错误 | 域名证书无效或未备案被拦截 |
