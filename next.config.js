/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    // Disable static generation completely
    staticPageGenerationTimeout: 0,
    // Force dynamic rendering
    dynamicParams: true,
    // Disable static optimization
    optimizePackageImports: [],
  },
  // Completely disable static generation
  output: 'standalone',
  trailingSlash: false,
  // Disable all static optimization
  swcMinify: false,
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
  // Disable static file serving
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
