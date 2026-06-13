// SPDX-License-Identifier: Apache-2.0

const [major] = process.versions.node.split('.').map(Number);

if (major !== 24) {
  console.error(
    [
      'TCRN-TMS development now requires Node.js >=24.0.0 <25.',
      `Current runtime: Node.js ${process.version}.`,
      'Switch to Node 24 before running pnpm dev.',
    ].join('\n')
  );
  process.exit(1);
}
