const apiOrigin = process.env.TMS_API_ORIGIN || 'http://localhost:4000';

function normalizeDevOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).host;
  } catch {
    return trimmed;
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
module.exports.readAllowedDevOrigins = readAllowedDevOrigins;
