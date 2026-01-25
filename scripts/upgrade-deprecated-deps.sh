#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# 升级已弃用依赖脚本

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🚀 升级已弃用依赖 - ESLint & Next.js                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 备份
echo "【1/5】创建备份..."
find . -name "package.json" -not -path "*/node_modules/*" -exec cp {} {}.pre-upgrade \;
echo "✅ 备份完成"
echo ""

# 升级 ESLint
echo "【2/5】升级 ESLint 8.57.1 → 9.39.2..."
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  if grep -q '"eslint"' "$file"; then
    echo "  更新: $file"
    sed -i '' 's/"eslint": "8\.57\.1"/"eslint": "9.39.2"/g' "$file"
  fi
done
echo "✅ ESLint 版本已更新"
echo ""

# 升级 Next.js
echo "【3/5】升级 Next.js 14.2.22 → 15.1.6..."
if grep -q '"next"' apps/web/package.json; then
  echo "  更新: apps/web/package.json"
  sed -i '' 's/"next": "14\.2\.22"/"next": "15.1.6"/g' apps/web/package.json
  sed -i '' 's/"eslint-config-next": "14\.2\.22"/"eslint-config-next": "15.1.6"/g' apps/web/package.json
fi
echo "✅ Next.js 版本已更新"
echo ""

# 显示变更
echo "【4/5】验证变更..."
echo ""
echo "ESLint 版本:"
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.pre-upgrade" | xargs grep '"eslint":' | head -5

echo ""
echo "Next.js 版本:"
grep '"next":' apps/web/package.json || echo "  未找到"

echo ""
echo "【5/5】准备安装依赖..."
echo "  提示: 运行 'pnpm install --no-frozen-lockfile' 来安装新版本"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              版本更新完成！                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
