// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
