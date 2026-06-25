#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "缺少 .env.local，请先: cp .env.example .env.local 并填入 DASHSCOPE_API_KEY"
  exit 1
fi

docker compose build
docker compose up -d
echo ""
echo "容器已启动，监听 127.0.0.1:3001"
echo "健康检查: curl http://127.0.0.1:3001/api/health"
echo "配置 Nginx 反代 + HTTPS 后对外: https://your-domain.com/agent"
