import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'firebasestorage.googleapis.com' },
      { protocol:'https', hostname:'lh3.googleusercontent.com' },
    ],
  },
  // Suppress punycode deprecation warning
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, punycode: false }
    return config
  },
}

export default nextConfig
