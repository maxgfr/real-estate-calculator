/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isProd ? '/real-estate-calculator' : '',
  assetPrefix: isProd ? '/real-estate-calculator' : '',
  images: {
    unoptimized: true,
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
