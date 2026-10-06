/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevent double-canvas init in Phaser 3
  swcMinify: true,
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.externals = [...(config.externals || [])];
    return config;
  }
};

export default nextConfig;
