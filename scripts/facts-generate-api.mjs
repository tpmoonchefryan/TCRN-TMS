#!/usr/bin/env node
// 生成 API handler 事实基线。
// 确定性契约(TCRN-TMS-GATE-002):无时间戳、固定排序、清洁检出下重跑字节一致。
// 用法:node scripts/facts-generate-api.mjs [--check]
//   --check 只校验现有产物是否与重新生成的一致,不写文件。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MD = join(REPO, 'docs/facts/api-handlers.md');
const OUT_JSON = join(REPO, 'docs/facts/api-handlers.json');
const INVENTORY = join(REPO, 'api-registry-current-controller-inventory.json');

const normPath = (s) =>
  String(s || '/')
    .trim()
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\*([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\/+$/, '') || '/';

function loadInventory() {
  const preexisting = existsSync(INVENTORY);
  execFileSync('node', ['apps/api/scripts/write-api-registry-controller-inventory.mjs'], {
    cwd: REPO,
    stdio: 'pipe',
  });
  const raw = JSON.parse(readFileSync(INVENTORY, 'utf8'));
  // 提取器把工件写在仓根;不是我们产的就清掉,避免污染工作树。
  if (!preexisting) unlinkSync(INVENTORY);
  return raw;
}

const inv = loadInventory();

const facts = inv.handlers
  .map((h) => ({
    method: String(h.method).toUpperCase(),
    path: normPath(h.pathTemplate),
    file: h.file,
    line: h.line,
    className: h.className,
    handlerName: h.handlerName,
    tag: h.tag || '',
    isPublic: Boolean(h.isPublic),
    excluded: Boolean(h.excluded),
    hasApiOperation: Boolean(h.hasApiOperation),
    hasApiResponse: Boolean(h.hasApiResponse),
    // 权限条目是 {resource, action} 对象。归一为 "resource:action" 字符串后再排序:
    // 对象数组既排不出稳定序(sort 比较的是 "[object Object]"),渲染进 markdown 也是 [object Object]。
    requiredPermissions: [...(h.requiredPermissions || [])]
      .map((p) => (typeof p === 'string' ? p : `${p.resource}:${p.action}`))
      .sort(),
    // 提取器对包装装饰器(@RequireConfigEntityPermission 等)是盲的,这里原样保留它的兜底标志,
    // 使「静态提取器看不见的受控 handler」在事实里可被识别,而不是静默变成「无权限」。
    dynamicPermissionResolver: Boolean(h.dynamicPermissionResolver),
  }))
  // 固定排序:method + path + file + line,保证同输入必同输出
  .sort(
    (a, b) =>
      a.method.localeCompare(b.method) ||
      a.path.localeCompare(b.path) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
  )
  .map((h, i) => ({ id: `TMS-F-API-${String(i + 1).padStart(3, '0')}`, ...h }));

const denominatorSha = createHash('sha256')
  .update([...new Set(facts.map((f) => `${f.method} ${f.path}`))].sort().join('\n') + '\n')
  .digest('hex');

const tally = {
  total: facts.length,
  controllers: new Set(facts.map((f) => f.file)).size,
  withPermissions: facts.filter((f) => f.requiredPermissions.length > 0).length,
  publicMarked: facts.filter((f) => f.isPublic).length,
  neitherPermissionedNorPublic: facts.filter(
    (f) => f.requiredPermissions.length === 0 && !f.isPublic && !f.excluded
  ).length,
  missingApiOperation: facts.filter((f) => !f.hasApiOperation).length,
  missingApiResponse: facts.filter((f) => !f.hasApiResponse).length,
};

const json = JSON.stringify(
  { schema: 'tcrn.tms.facts.api-handlers.v1', denominatorSha256: denominatorSha, tally, facts },
  null,
  2
);

const rows = facts
  .map(
    (f) =>
      `| \`${f.id}\` | \`${f.method}\` | \`${f.path}\` | ${f.file}:${f.line} | ${
        f.requiredPermissions.length
          ? f.requiredPermissions.map((p) => `\`${p}\``).join(' ')
          : f.isPublic
            ? '_public_'
            : '**—**'
      } | ${f.hasApiOperation ? '✓' : '✗'} | ${f.hasApiResponse ? '✓' : '✗'} |`
  )
  .join('\n');

const md = `# API handler 事实基线

> 治理记录:\`TCRN-TMS-STORY-006\`(Epic \`TCRN-TMS-EPIC-002\`)· 分解裁定 minutes \`TCRN-TMS-MIN-001\` · 门 \`TCRN-TMS-GATE-002\`
>
> **本文件由 \`scripts/facts-generate-api.mjs\` 生成,请勿手改。** 重跑 \`node scripts/facts-generate-api.mjs\` 覆盖;\`--check\` 校验一致性。

## 分母

- **${tally.total}** 条 handler,来自 **${tally.controllers}** 个 controller 文件。
- 归一化路由清单内容 sha256:\`${denominatorSha}\`
- 该分母已由两个独立提取器逐条互钉,详见 [\`_meta/denominator-registry.md\`](_meta/denominator-registry.md)。

## 权威层级

全部 \`api-contract\` 级(来源=controller 装饰器)。按 [权威序](README.md#权威序),该层级可支撑 \`proven\`。

## 汇总

| 指标 | 数量 |
|---|---|
| handler 总数 | ${tally.total} |
| controller 文件数 | ${tally.controllers} |
| 带权限装饰器 | ${tally.withPermissions} |
| 标记为 public | ${tally.publicMarked} |
| **既无权限也非 public** | **${tally.neitherPermissionedNorPublic}** |
| 缺 \`@ApiOperation\` | ${tally.missingApiOperation} |
| 缺 \`@ApiResponse\` | ${tally.missingApiResponse} |

「既无权限也非 public」的 ${tally.neitherPermissionedNorPublic} 条是待判定项,逐条判定见 \`TCRN-TMS-STORY-011\`。

## 事实表

每行一条 fact,\`confidence: proven\`(证据=controller 源码位置),\`authority_tier: api-contract\`。

| id | 方法 | 路径 | 证据 locator | 权限 | ApiOperation | ApiResponse |
|---|---|---|---|---|---|---|
${rows}
`;

if (process.argv.includes('--check')) {
  let ok = true;
  for (const [p, want] of [
    [OUT_MD, md],
    [OUT_JSON, json],
  ]) {
    const got = existsSync(p) ? readFileSync(p, 'utf8') : null;
    if (got !== want) {
      console.error(`DRIFT: ${p} 与重新生成的内容不一致`);
      ok = false;
    }
  }
  if (!ok) process.exit(1);
  console.log(JSON.stringify({ ok: true, checked: 2, denominatorSha256: denominatorSha }));
} else {
  writeFileSync(OUT_MD, md);
  writeFileSync(OUT_JSON, json);
  console.log(JSON.stringify({ ok: true, written: [OUT_MD, OUT_JSON], tally }, null, 2));
}
