/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  assetPrefix: './',
  basePath: '',
  images: {
    unoptimized: true
  },
  // For desktop app, API calls will go directly to localhost:3001
  async rewrites() {
    return []
  },
}

module.exports = nextConfig