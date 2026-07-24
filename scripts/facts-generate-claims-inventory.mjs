#!/usr/bin/env node
// 生成文档声称清册(TCRN-TMS-STORY-020)。
// 自足:直接从 docs/ 抽取 → 分类 → 生成,不依赖任何中间文件。
// 确定性契约(TCRN-TMS-GATE-002):无时间戳、固定排序、清洁检出下重跑字节一致。
//
// 用法:node scripts/facts-generate-claims-inventory.mjs [--check]
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['docs/user-guide', 'docs/wiki-draft'];
const OUT = join(REPO, 'docs/facts/_meta/doc-claims-inventory.md');

function walk(dir, acc = []) {
  for (const e of readdirSync(dir).sort()) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (e.endsWith('.md')) acc.push(relative(REPO, p));
  }
  return acc;
}

// 分类依据:「什么证据能推翻它」。顺序敏感 —— 先匹配先归类。
function classify(t) {
  if (/Clean|Blocker-aware|Owner-accepted|Excluded|proof slice|not yet|G19|OKL-/i.test(t))
    return 'proof-status';
  if (
    /^[A-Z][a-z]+ [a-z]+ (page|screen|console|studio)|page|screen|route|navigation|menu|tab\b/i.test(
      t
    )
  )
    return 'ui-surface';
  if (/API|endpoint|webhook|request|response|POST|GET|OpenAPI|adapter/i.test(t))
    return 'api-contract';
  if (/permission|role|RBAC|scope|access|admin|tenant isolation/i.test(t)) return 'permission';
  if (/field|record|model|data|export|import|database/i.test(t)) return 'data';
  return 'prose';
}

const files = ROOTS.filter((r) => existsSync(join(REPO, r)))
  .flatMap((r) => walk(join(REPO, r)))
  .sort();

const claims = [];
let totalLines = 0;
for (const f of files) {
  const lines = readFileSync(join(REPO, f), 'utf8').split('\n');
  totalLines += lines.length;
  lines.forEach((l, i) => {
    const m = l.match(/^\s*[-*]\s+(.{6,})$/);
    if (!m) return;
    const text = m[1].trim();
    claims.push({ file: f, line: i + 1, text, klass: classify(text) });
  });
}
claims.forEach((c, i) => (c.id = 'TMS-C-' + String(i + 1).padStart(3, '0')));

const byFile = {};
for (const x of claims) (byFile[x.file] = byFile[x.file] || []).push(x);
const tally = {};
for (const x of claims) tally[x.klass] = (tally[x.klass] || 0) + 1;

const klassDesc = {
  'api-contract': '可对 [api-handlers.md](../api-handlers.md) 的 398 条 handler 事实机械判定',
  permission: '可对 RBAC 事实(46 资源)机械判定',
  data: '可对 Prisma schema 事实(88 model)机械判定',
  'ui-surface': '需 source 级(页面存在)或 runtime 级(实际渲染)证据',
  'proof-status': '**不是产品事实** —— 是旧证明流程的状态标注(G19 / OKL- / Clean 等)',
  prose: '可证伪性未定,须逐条人判',
};

const L = [];
L.push('# 文档声称清册');
L.push('');
L.push(
  '> 治理记录:`TCRN-TMS-STORY-020`(Epic `TCRN-TMS-EPIC-006`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-003`'
);
L.push('>');
L.push('> **本文件由 `scripts/facts-generate-claims-inventory.mjs` 生成,请勿手改。**');
L.push('');
L.push('## 范围');
L.push('');
L.push(
  '`docs/user-guide/` 与 `docs/wiki-draft/` 共 **' +
    files.length +
    ' 个文件、' +
    totalLines +
    ' 行**,抽出 **' +
    claims.length +
    ' 条**候选声称(markdown 列表项)。'
);
L.push('');
L.push('每条声称获得一个稳定 id `TMS-C-NNN`,供三批审计(`TCRN-TMS-STORY-021`~`023`)逐条判定引用。');
L.push('');
L.push(
  '> **id 稳定性的边界**:编号按文件名排序、行号顺序生成。**审计过程中修改文档会使其后所有 id 位移。** 故审计须以「一批一次重生成、批内引用当次 id」的方式进行,不可跨批沿用旧号。'
);
L.push('');
L.push('## 按「什么证据能推翻它」分类');
L.push('');
L.push('| 类别 | 条数 | 判定所需证据 |');
L.push('|---|---|---|');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  L.push('| `' + k + '` | ' + v + ' | ' + klassDesc[k] + ' |');
L.push('');
L.push(
  '**分类是启发式的**(关键词匹配),不是判定。它只决定每条声称该拿哪把尺子量;审计时须逐条复核归类本身是否正确。'
);
L.push('');
L.push('### 两个需要立刻说清的类别');
L.push('');
L.push(
  '**`proof-status`(' +
    (tally['proof-status'] || 0) +
    ' 条)不是产品事实。** 这些行描述的是旧证明流程的状态(`Clean` / `Blocker-aware` / `Owner-accepted` / `Excluded` / `G19` / `OKL-*`),不是系统的行为。其支撑证据随旧 vault 于 2026-07-20 归档移出本仓,故 `OKL-*` 限制 ID 现为孤儿。处置见 `TCRN-TMS-STORY-024`。'
);
L.push('');
L.push(
  '**`prose`(' +
    (tally['prose'] || 0) +
    ' 条,占 ' +
    Math.round(((tally['prose'] || 0) / claims.length) * 100) +
    '%)可证伪性未定。** 这是本清册最重要的发现:近半数声称无法从文本本身看出「什么观测能推翻它」。一条不可证伪的声称既不能被证实也不能被证伪 —— 审计只有两条诚实出路:改写成可证伪的形式,或标记为不可判定。**不得默认它为真。**'
);
L.push('');
L.push('## 已知为假的声称(审计前即已实证)');
L.push('');
L.push('两条在勘察阶段即被源码推翻。列此作为审计起点与尺子的校准样本。');
L.push('');
L.push('**一、`docs/user-guide/platform-admin/README.md:11`**');
L.push('');
L.push(
  '声称 AC 控制台暴露 “Interface and webhook management.”。实况:`apps/web/src/app/ac/[tenantId]/interface-management/page.tsx` 与 `.../webhook-management/page.tsx` 均只渲染 `AcBusinessRouteUnavailableScreen`。该声称**对 AC scope 为假**;tenant 侧同名路由仍为真 —— 原文缺 scope 限定,这是 `ui-surface` 类最常见的失效方式。'
);
L.push('');
L.push('**二、`docs/user-guide/public-presence/README.md:10`**');
L.push('');
L.push(
  '声称 “Homepage/studio/editor pages.”。实况:`apps/web/src/app` 下 `studio/editor` 零命中,实际路径为 `/studio/public-presence/[tenantId]/[talentId]`。但原文究竟是否在指一条路径,本身即有歧义 —— 这正是 `prose` 类的典型病症:**连「它错了没有」都要先裁定它在说什么。**'
);
L.push('');
L.push('## 文件分布');
L.push('');
L.push('| 文件 | 声称数 |');
L.push('|---|---|');
for (const [f, arr] of Object.entries(byFile).sort(
  (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
))
  L.push('| `' + f + '` | ' + arr.length + ' |');
L.push('');
L.push('## 全量清册');
L.push('');
L.push(
  '<!-- facts:links:ignore-start —— 以下是逐字引文,其中的相对路径以原文件为基准,不是本文件的引用 -->'
);
L.push('');
for (const f of Object.keys(byFile).sort()) {
  L.push('### `' + f + '`');
  L.push('');
  L.push('| id | 行 | 类别 | 声称 |');
  L.push('|---|---|---|---|');
  for (const x of byFile[f])
    L.push(
      '| `' +
        x.id +
        '` | ' +
        x.line +
        ' | `' +
        x.klass +
        '` | ' +
        x.text.replace(/\|/g, '\\|').slice(0, 150) +
        ' |'
    );
  L.push('');
}

L.push('<!-- facts:links:ignore-end -->');
L.push('');

const md = L.join('\n');

if (process.argv.includes('--check')) {
  const got = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
  if (got !== md) {
    console.error('DRIFT: docs/facts/_meta/doc-claims-inventory.md 与重新生成的内容不一致');
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, claims: claims.length, files: files.length }));
} else {
  writeFileSync(OUT, md);
  console.log(
    JSON.stringify(
      { ok: true, written: relative(REPO, OUT), claims: claims.length, files: files.length, tally },
      null,
      2
    )
  );
}
