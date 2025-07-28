/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Completely disable static generation
  output: 'standalone',
  trailingSlash: false,
  // Disable static optimization
  staticPageGenerationTimeout: 0,
  // Add headers to prevent static generation
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate, no-cache',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  // Disable image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
