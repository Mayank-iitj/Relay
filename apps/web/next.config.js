/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    if (process.env.CORE_API_URL) {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.CORE_API_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;

