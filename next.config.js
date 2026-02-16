/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow longer serverless function execution for job matching
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
