# Health Link · 健康翻译层

个人健康档案应用：本地 PDF 解析、纵向趋势可视化、就诊参考卡生成，以及经服务端代理的 Gemini AI 指标解读。

## 架构

- **前端**：React 19 + Vite + Tailwind（端口 3000）
- **API**：Express 代理 Gemini（端口 3001，`/api/gemini/*`）
- **存储**：浏览器 `localStorage`（档案状态、用药清单、备注）
- **PDF**：`pdfjs-dist` 在浏览器本地提取文本

## 快速开始

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 DASHSCOPE_API_KEY 或 HUNYUAN_API_KEY（见 .env.example）
npm run dev
```

访问 http://localhost:3000

### 健康解读 Agent（H5）

手机友好入口：**http://localhost:3000/agent**

- 上传 PDF / 拍照 → 本地/服务端解析 → 规则红旗（即时）→ LLM 摘要与 Top 异常解读 → 随访问答
- 会话存于 `localStorage`（`health-link:agent-sessions`），无需登录
- API：`POST /api/agent/interpret`（`mode: summary | items`）、`POST /api/agent/chat`
- 主应用侧栏「看懂新报告」可进入；解读完成后可同步到主档案，并继续生成就诊卡

`npm run dev` 会同时启动 Vite 前端与 Express API。也可分别运行：

```bash
npm run dev:web   # 仅前端
npm run dev:api   # 仅 API
```

## 生产部署

```bash
npm run build
npm start
```

生产模式下 Express 同时提供 API 与 `dist/` 静态资源。

## 环境变量

| 变量 | 说明 |
|------|------|
| `LLM_PROVIDER` | `auto`（默认）\| `dashscope` \| `hunyuan` \| `gemini` |
| `DASHSCOPE_API_KEY` | 阿里云百炼 / 通义千问 API Key（推荐） |
| `DASHSCOPE_CHAT_MODEL` | 对话模型，默认 `qwen-plus` |
| `HUNYUAN_API_KEY` | 腾讯混元 API Key |
| `HUNYUAN_MODEL` | 默认 `hunyuan-turbos-latest` |
| `GEMINI_API_KEY` | Google Gemini（可选） |
| `PORT` | API 端口，默认 3001 |
| `RAG_ENABLED` | 设为 `false` 关闭 RAG |
| `RAG_MAX_CHUNKS` | 知识片段上限，默认 8 |

`auto` 模式下优先级：**百炼 → 混元 → Gemini**（按已配置的有效 Key）。

### 配置示例（一人公司 · 百炼为主）

```bash
cp .env.example .env.local
# 编辑 .env.local：
LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-你的百炼密钥
DASHSCOPE_CHAT_MODEL=qwen-plus
```

腾讯混元：

```bash
LLM_PROVIDER=hunyuan
HUNYUAN_API_KEY=你的混元密钥
HUNYUAN_MODEL=hunyuan-turbos-latest
```

验证：

```bash
curl http://localhost:3001/api/health
# llmConfigured: true, llmProvider: "dashscope", llmLabel: "阿里云百炼 / 通义千问"
```

## RAG 知识层（L1–L6，与 health_agent 共享）

知识库**唯一维护位置**：`src/data/knowledge/`（L1 参考范围 + L2–L6 解读/安全层）。

编辑后导出给 Python `health_agent` 与 `health-linker`：

```bash
npm run export:kb
```

导出目标：

| 文件 | 用途 |
|------|------|
| `../health-linker/knowledge/indicators.json` | 结构化指标（L1+L2 摘要） |
| `../health-linker/knowledge/knowledge_chunks.json` | 完整 RAG 片段 |
| `../health_agent/data/knowledge_chunks.json` | health_agent 同上（副本） |

```
Observation[] + 红旗规则
    → retrieveKnowledge()（本地结构化检索）
    → formatChunksForPrompt()
    → POST /api/gemini/interpret-rag（Gemini + 引用约束）
```

- 知识片段：`src/data/knowledge/`（L2 异常解释、L3 风险、L4 生活方式、L5 照护等级、L6 安全）
- UI：「说人话」页默认开启 **档案 RAG 模式**，展示 `citations` 与证据来源

## OCR / 文档解析：一人公司怎么选、怎么测

体检报告流水线建议拆成两层，**不要用对话大模型替代专用 OCR**：

| 环节 | 推荐 | 说明 |
|------|------|------|
| PDF 文字层 | 现有 `pdfjs-dist` | 可复制文本的 PDF 已在浏览器本地解析 |
| 扫描件 / 拍照 | **阿里云文档智能 Document Mind** 或 **腾讯云 OCR 智能结构化** | 表格、版面、纠偏、去噪是专用能力 |
| 说人话 / RAG | **百炼 DashScope (Qwen)** 或现有 **Gemini 代理** | 在结构化 `Observation[]` 之上做解读 |
| 腾讯混元 | 微信生态深度集成时考虑 | OCR 仍用腾讯云 OCR 产品，而非混元对话 API |

### 为什么百炼更适合你现在的 RAG 栈

- 已有 Gemini 做「说人话」；国内合规与 latency 可逐步切到 DashScope OpenAI 兼容模式
- **OCR 表格** 应走 Document Mind（百炼控制台可开通试用），不是 `qwen-max` 聊天
- 腾讯混元优势在小程序/企微；若主战场不是微信，OCR 用腾讯、RAG 用百炼/Gemini 即可混搭

### 立刻可测的三步

**1. RAG 解读（已内置）**

```bash
npm run dev
# .env.local 配置 DASHSCOPE_API_KEY 或 HUNYUAN_API_KEY
# 打开「说人话」→ 勾选同意 → 保持「档案 RAG 模式」→ 输入指标解读
curl http://localhost:3001/api/health
# 应看到 ragEnabled: true, geminiConfigured: true
```

**2. 扫描件 OCR PoC（百炼 Qwen-VL，可选）**

```bash
# .env.local 增加 DASHSCOPE_API_KEY=sk-...
curl -X POST http://localhost:3001/api/document/vision-parse \
  -H 'Content-Type: application/json' \
  -d '{"imageBase64":"<BASE64>","mimeType":"image/jpeg"}'
```

返回 JSON 含 `items[]`（名称/结果/参考范围）。**PoC 级别**——生产表格请接 Document Mind API。

**3. 生产级表格（阿里云 Document Mind 试用）**

1. 登录 [阿里云文档智能控制台](https://docmind.console.aliyun.com/)
2. 开通「文档解析 / 表格识别」按量试用
3. 用官方 SDK 上传 PDF/图片，拿结构化 JSON，再映射到 `Observation[]`（与 `observationExtract.ts` 对齐）

腾讯云对等路径：[文字识别 OCR](https://cloud.tencent.com/product/ocr) → 通用印刷体 / 表格 V3 → 智能结构化。

## 测试

```bash
npm test
npm run lint
```

## 隐私说明

- PDF 文本在浏览器本地解析，结果存入 localStorage
- AI 解读（指标翻译、协议调和）经 `/api/gemini` 代理调用，API Key 不暴露给客户端
- 本应用不提供医疗诊断，详见各页面免责声明
