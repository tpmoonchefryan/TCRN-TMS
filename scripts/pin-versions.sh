#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# 固化所有 package.json 中的依赖版本（移除 ^ 和 ~ 前缀）

set -e

echo "======================================"
echo "=== 固化依赖版本脚本 ==="
echo "======================================"
echo ""

# 查找所有 package.json 文件
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" | while read -r file; do
  echo "处理: $file"
  
  # 使用 sed 移除 ^ 和 ~ 符号
  # macOS 需要 '' 作为 -i 的参数
  sed -i '' 's/"\^/"/g' "$file"
  sed -i '' 's/"~/"/g' "$file"
  
  # 验证 JSON 格式
  if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
    echo "  ❌ 错误: JSON 格式不正确"
    exit 1
  fi
  
  echo "  ✅ 已固化版本"
done

echo ""
echo "======================================"
echo "=== 所有版本已固化 ==="
echo "======================================"
