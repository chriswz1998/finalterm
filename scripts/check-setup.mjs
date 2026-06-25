#!/usr/bin/env node
/**
 * 检查本地开发配置：.env.local + API 是否就绪（需先 npm run dev）
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const port = process.env.PORT || '3001';
const base = `http://localhost:${port}`;

const PLACEHOLDER = [/MY_/i, /^sk-\.\.\.$/, /^your[-_]/i, /^xxx$/i, /^sk-your-/i, /你的/i, /placeholder/i, /replace[-_]?me/i];

function isRealKey(key) {
  const trimmed = key?.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER.some((p) => p.test(trimmed));
}

const dashscopeRaw = process.env.DASHSCOPE_API_KEY?.trim();
const hunyuanRaw = process.env.HUNYUAN_API_KEY?.trim();
const raccoonRaw = process.env.RACCOON_API_TOKEN?.trim();
const dashscope = isRealKey(dashscopeRaw);
const hunyuan = isRealKey(hunyuanRaw);
const raccoon = isRealKey(raccoonRaw);
const llmProvider = process.env.LLM_PROVIDER || 'auto';

console.log('\n=== Health Link 配置检查 ===\n');
console.log(`LLM_PROVIDER: ${llmProvider}（② 标准化 / ③ RAG / ④ 摘要 / 问答）`);
console.log(
  `DASHSCOPE_API_KEY: ${dashscope ? '有效 ✓' : dashscopeRaw ? '仍是占位符 ✗' : '未设置'}`,
);
console.log(
  `HUNYUAN_API_KEY: ${hunyuan ? '有效 ✓' : hunyuanRaw ? '仍是占位符 ✗' : '未设置'}`,
);
console.log(
  `RACCOON_API_TOKEN: ${raccoon ? '有效 ✓' : raccoonRaw ? '仍是占位符 ✗' : '未设置'}（办公小浣熊跨报告分析）`,
);
console.log(`RACCOON_API_HOST: ${process.env.RACCOON_API_HOST || 'https://xiaohuanxiong.com'}`);
console.log(`ENABLE_RACCOON_ANALYSIS: ${process.env.ENABLE_RACCOON_ANALYSIS !== 'false' ? 'true' : 'false'}`);
console.log(`DASHSCOPE_CHAT_MODEL: ${process.env.DASHSCOPE_CHAT_MODEL || 'qwen-plus (默认)'}`);
console.log(`RAG_ENABLED: ${process.env.RAG_ENABLED !== 'false' ? 'true' : 'false'}`);

if (!dashscope && !hunyuan) {
  console.log('\n请在 .env.local 配置至少一个 LLM 密钥（百炼或混元）：');
  console.log('  DASHSCOPE_API_KEY → https://dashscope.console.aliyun.com/');
  console.log('  或 HUNYUAN_API_KEY → https://console.cloud.tencent.com/tokenhub');
  process.exit(1);
}

if (!raccoon) {
  console.log('\n提示: 未配置 RACCOON_API_TOKEN，跨报告分析将降级为 LLM 文本摘要。');
  console.log('  办公小浣熊 JWT → RACCOON_API_HOST=https://xiaohuanxiong.com');
}

async function ping(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      return { ok: res.ok, body };
    } catch {
      return {
        ok: false,
        error: res.ok
          ? '非 JSON 响应'
          : `HTTP ${res.status}（若为 <!DOCTYPE，请重启 npm run dev 以加载路由）`,
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const health = await ping(`${base}/api/health`);
const agent = await ping(`${base}/api/agent/health`);
const raccoonStatus = await ping(`${base}/api/import/raccoon-status`);

console.log('\n--- API 连通性（需 npm run dev）---\n');

if (!health.ok) {
  console.log(`✗ ${base}/api/health 无法连接`);
  console.log(`  ${health.error ?? 'HTTP 错误'}`);
  console.log('\n请先运行: cd health-link && npm run dev\n');
  process.exit(1);
}

console.log(
  `✓ 主 API: llm=${health.body.llmConfigured} (${health.body.llmProvider}), raccoon=${health.body.raccoonConfigured}`,
);

if (raccoonStatus.ok) {
  console.log(`✓ 办公小浣熊配置: configured=${raccoonStatus.body.configured}`);
}

if (!agent.ok) {
  console.log(`✗ Agent API 不可用: ${agent.error ?? 'HTTP 错误'}`);
  process.exit(1);
}

console.log(`✓ Agent API: llmConfigured=${agent.body.llmConfigured}, label=${agent.body.llmLabel ?? '—'}`);
console.log('\n可以打开:');
console.log('  主应用  http://localhost:3000');
console.log('  报告复盘 /interpret');
console.log('  Agent   http://localhost:3000/agent\n');
