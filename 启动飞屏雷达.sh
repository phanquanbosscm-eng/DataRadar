#!/bin/bash
# 飞屏雷达 - 一键启动脚本
cd "$(dirname "$0")"
echo "🚀 启动飞屏雷达 LED 贸易决策指挥中心..."
echo ""
node --input-type=module --eval "
import {createServer} from './node_modules/vite/dist/node/index.js';
const s = await createServer({ root: process.cwd() });
await s.listen();
s.printUrls();
console.log('');
console.log('✅ 飞屏雷达已启动！请在浏览器中访问上方地址');
console.log('💡 按 Ctrl+C 停止服务');
"
