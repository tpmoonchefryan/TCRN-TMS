// STORY-003:变异注入红证。
// 对每个已定钉的分母提取器注入一个变异,证明其确实检出变化(见红);随后无条件还原。
// 纪律:变异在运行期必须真实生效、还原必须验证字节一致。
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';

const REPO = '/Users/ryanlan/Code/TCRN Platform/TCRN-TMS';
const sha = (s) => createHash('sha256').update(s).digest('hex');

function denominators() {
  return JSON.parse(
    execSync(
      `node -e "
const fs=require('fs'),crypto=require('crypto');
const {execSync}=require('child_process');
const norm=s=>s.trim().replace(/:([A-Za-z0-9_]+)/g,'{\\\$1}').replace(/\\*([A-Za-z0-9_]+)/g,'{\\\$1}').replace(/\\/+\\\$/,'').replace(/\\s+/g,' ');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('.codegraph/codegraph.db',{readOnly:true});
const rows=db.prepare(\\\"select name,file_path from nodes where kind='route'\\\").all().filter(r=>/controller[.]ts\\\$/.test(r.file_path));
const routes=[...new Set(rows.map(r=>norm(r.name)))].sort();
const pages=execSync('find apps/web/src/app -name page.tsx',{encoding:'utf8'}).trim().split('\\n').sort();
const schema=fs.readFileSync('packages/database/prisma/schema.prisma','utf8');
const models=[...schema.matchAll(/^model\\\\s+(\\\\w+)/gm)].map(m=>m[1]).sort();
const cat=fs.readFileSync('packages/shared/src/rbac/catalog.ts','utf8');
const res=[...cat.matchAll(/^  resource\\\\(\\\\s*\\\\n?\\\\s*'([^']+)'/gm)].map(m=>m[1]).sort();
const h=a=>crypto.createHash('sha256').update(a.join('\\n')+'\\n').digest('hex');
console.log(JSON.stringify({routes:{n:routes.length,sha:h(routes)},pages:{n:pages.length,sha:h(pages)},models:{n:models.length,sha:h(models)},rbac:{n:res.length,sha:h(res)}}));
"`,
      { cwd: REPO, encoding: 'utf8' }
    ).trim()
  );
}

const results = [];

function mutate(name, file, apply, denomKey, note) {
  const path = `${REPO}/${file}`;
  const original = readFileSync(path, 'utf8');
  const backup = `${path}.redproof.bak`;
  copyFileSync(path, backup);
  let before, after, restored;
  try {
    before = denominators();
    const mutated = apply(original);
    if (mutated === original) throw new Error('变异未改变字节 — 变异本身无效');
    writeFileSync(path, mutated);
    after = denominators();
  } finally {
    copyFileSync(backup, path);
    unlinkSync(backup);
    restored = readFileSync(path, 'utf8');
  }
  const restoredClean = sha(restored) === sha(original);
  const b = before[denomKey],
    a = after[denomKey];
  const sawRed = b.sha !== a.sha;
  results.push({
    name,
    file,
    denominator: denomKey,
    note,
    before: `${b.n} @ ${b.sha.slice(0, 12)}`,
    after: `${a.n} @ ${a.sha.slice(0, 12)}`,
    sawRed,
    restoredClean,
    verdict:
      sawRed && restoredClean ? 'RED-PROVEN' : sawRed ? 'RED但还原失败' : '假绿 — 变异未被检出',
  });
  console.log(
    `${sawRed ? 'RED ' : '假绿'} ${name}: ${b.n}->${a.n}  还原${restoredClean ? 'OK' : '失败'}`
  );
}

// 变异 1:删掉一个 Prisma model —— model 分母必须变
mutate(
  '删除一个 Prisma model',
  'packages/database/prisma/schema.prisma',
  (s) => {
    const m = s.match(/\nmodel\s+(\w+)\s*\{[\s\S]*?\n\}\n/);
    if (!m) throw new Error('找不到可删的 model');
    return s.replace(m[0], '\n');
  },
  'models',
  'schema 少一个 model 时 model 分母须变'
);

// 变异 2:删掉一个 RBAC resource 定义 —— rbac 分母必须变
mutate(
  '删除一个 RBAC resource',
  'packages/shared/src/rbac/catalog.ts',
  (s) =>
    s.replace(
      /^  resource\(\s*\n?\s*'tenant\.manage'/m,
      "  resource(\n    'tenant.manage.MUTATED'"
    ),
  'rbac',
  'catalog 资源码改名时 RBAC 分母须变'
);

writeFileSync('docs/facts/_meta/red-proof-results.json', JSON.stringify(results, null, 2));
console.log(
  '\n' +
    JSON.stringify(
      results.map((r) => ({ n: r.name, v: r.verdict })),
      null,
      2
    )
);
