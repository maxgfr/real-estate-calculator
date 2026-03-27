/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.BASE_PATH !== undefined
  ? process.env.BASE_PATH
  : (isProd ? '/real-estate-calculator' : '');

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
