#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "缺少 .env.local，请先: cp .env.example .env.local 并填入 DASHSCOPE_API_KEY"
  exit 1
fi

npm ci
npm run build
npm install -g pm2 2>/dev/null || true
pm2 start ecosystem.config.cjs --update-env
pm2 save
echo ""
echo "已启动。本机: http://127.0.0.1:3001/agent"
echo "健康检查: curl http://127.0.0.1:3001/api/health"
echo "开机自启: pm2 startup  （按提示执行一条 sudo 命令）"
