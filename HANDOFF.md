# Health Link 交付说明（Handoff）

独立运行包：`health-link/` 不依赖外层 monorepo（`Body OS_healther linker`、`health_agent` 等）。

---

## 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | **18+**（推荐 20 LTS） |
| 包管理器 | npm |
| 操作系统 | macOS / Windows / Linux |

---

## 方式一：Git 仓库

### 你（发送方）首次推送

```bash
cd health-link

# 若尚未初始化（本仓库已含 .git 时可跳过 init）
git init
git add .
git commit -m "Initial handoff: Health Link standalone"

# 在 GitHub / Gitee 创建私有仓库后：
git remote add origin <你的仓库 HTTPS 或 SSH 地址>
git branch -M main
git push -u origin main
```

**API Key 不要提交进 Git。** `.gitignore` 已排除 `.env.local`。

单独通过微信 / 1Password 等渠道把 `.env.local` 内容发给对方（或让对方自行申请百炼/混元 Key）。

### 小伙伴（接收方）克隆运行

```bash
git clone <仓库地址>
cd health-link

npm install
cp .env.example .env.local
# 编辑 .env.local，填入 DASHSCOPE_API_KEY 或 HUNYUAN_API_KEY

npm run dev
```

浏览器：

- 主应用：http://localhost:3000
- **Agent Demo**：http://localhost:3000/agent

验证：

```bash
npm run check:setup   # 需 dev 已启动
npm test              # 54/54 应全部通过
```

---

## 方式二：压缩包

### 你（发送方）生成 zip

```bash
cd health-link

# 推荐：仅源码（约几 MB，对方自行 npm install）
npm run pack:handoff

# 可选：含 node_modules（约 350MB，对方免 install，适合网络慢）
npm run pack:handoff:full
```

输出目录：`health-link/handoff/`

| 文件 | 说明 |
|------|------|
| `health-link-handoff-YYYYMMDD.zip` | 源码包（不含 node_modules、密钥） |
| `health-link-handoff-full-YYYYMMDD.zip` | 完整包（含 node_modules） |

将 zip 发给对方；**`.env.local` 单独安全传输**。

### 小伙伴（接收方）解压运行

```bash
unzip health-link-handoff-YYYYMMDD.zip
cd health-link

npm install
cp .env.example .env.local
# 填入 API Key

npm run dev
```

---

## 最低环境变量（`.env.local`）

至少配置 **一个** LLM Key：

```bash
LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-你的百炼密钥
DASHSCOPE_CHAT_MODEL=qwen-plus
DASHSCOPE_VISION_MODEL=qwen-vl-plus   # 图片 OCR 需要
PORT=3001
RAG_ENABLED=true
```

或使用腾讯混元：

```bash
LLM_PROVIDER=hunyuan
HUNYUAN_API_KEY=sk-你的混元密钥
```

可选（无则部分功能降级，不影响主 Demo）：

- `RACCOON_API_TOKEN` — 跨报告分析
- `GEMINI_API_KEY` — Gemini 回退
- `WECHAT_*` — 微信小程序登录

---

## 生产模式（可选）

```bash
npm run build
npm start
# 单端口 3001：API + 静态资源
# 访问 http://localhost:3001/agent
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| `llmConfigured: false` | 检查 `.env.local` 是否仍为占位符 |
| 图片上传解析失败 | 需配置 `DASHSCOPE_API_KEY` + `DASHSCOPE_VISION_MODEL` |
| 3000/3001 端口占用 | 改 `PORT` 或结束占用进程 |
| `npm run check:setup` 连不上 | 先 `npm run dev`，再另开终端检查 |

---

## 本包包含 / 不包含

**包含（可独立运行）：**

- React 前端 + Express API
- Agent `/agent` 全流程
- RAG 知识库 `src/data/knowledge/`
- Vitest 测试与 Demo CSV 样例

**不包含（运行不需要）：**

- 外层 `output/` 期末报告、`health_agent` Python 项目
- `npm run export:kb` 的跨项目导出（仅 monorepo 内维护知识库时用）
- `npm run capture:screenshots` 的 PDF 材料输出路径（指向外层 `output/`）
