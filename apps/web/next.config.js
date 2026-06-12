const apiOrigin = process.env.TMS_API_ORIGIN || 'http://localhost:4000';

function normalizeDevOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    const host = trimmed
      .replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, '')
      .split(/[/?#]/, 1)[0]
      .replace(/:\d+$/, '')
      .toLowerCase();

    return host || null;
  }
}

function readAllowedDevOrigins(raw = process.env.TMS_ALLOWED_DEV_ORIGINS || '') {
  const explicitOrigins = raw
    .split(',')
    .map(normalizeDevOrigin)
    .filter(Boolean);

  return [...new Set(['127.0.0.1', 'localhost', ...explicitOrigins])];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevOrigins: readAllowedDevOrigins(),
  transpilePackages: ['@tcrn/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
if (process.env.NODE_ENV === 'test') {
  module.exports.readAllowedDevOrigins = readAllowedDevOrigins;
}
