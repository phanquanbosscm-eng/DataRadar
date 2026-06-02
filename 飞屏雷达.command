#!/bin/bash
# 飞屏雷达 · LED 贸易决策指挥中心 v3
NODE="/Users/hui/Library/Application Support/Accio/external-tools/v15d5f06c40d6/node/bin/node"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  📡 飞屏雷达 - LED 贸易决策指挥中心"
echo "  ─────────────────────────────────────"

lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5174 | xargs kill -9 2>/dev/null
rm -rf "$DIR/node_modules/.vite"
sleep 0.5

echo "  📂 启动文件服务..."
"$NODE" "$DIR/server/index.js" > /tmp/feiping-server.log 2>&1 &
SERVER_PID=$!

for i in {1..12}; do
  sleep 0.5
  curl -s http://localhost:3001/api/plans > /dev/null 2>&1 && break
done
echo "  ✅ 文件服务就绪"

echo "  🚀 启动前端..."
echo ""
"$NODE" --input-type=module --eval "
import {createServer} from '$DIR/node_modules/vite/dist/node/index.js';
const s = await createServer({ root:'$DIR', server:{port:5174,strictPort:true} });
await s.listen();
console.log('  ✅ 飞屏雷达已启动：http://localhost:5174');
console.log('');
console.log('  数据目录：$DIR/radar/');
console.log('  ─────────────────────────────────────');
console.log('  每日：计划名/YYYY-MM-DD/keyword.xlsx');
console.log('  每周：计划名/YYYY-WXX/plan.xlsx  product.xlsx');
console.log('  ─────────────────────────────────────');
console.log('  关闭此窗口停止所有服务');
const {exec} = await import('child_process');
exec('open http://localhost:5174');
"

kill $SERVER_PID 2>/dev/null
