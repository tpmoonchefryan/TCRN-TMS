const lhciTargetUrl =
  process.env.TCRN_LHCI_TARGET_URL ||
  'http://127.0.0.1:6007/iframe.html?id=domains-public-presence-publicpresenceevidence--studio-home-ready&viewMode=story';
const lhciOutputDir = process.env.TCRN_LHCI_OUTPUT_DIR || '.tmp/lhci';

module.exports = {
  ci: {
    collect: {
      url: [lhciTargetUrl],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: lhciOutputDir,
    },
  },
};
