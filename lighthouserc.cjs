module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:3000'],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': 'warn',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.tmp/lhci',
    },
  },
};
