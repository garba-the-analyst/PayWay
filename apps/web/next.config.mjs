/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_PAYWAY_API: process.env.NEXT_PUBLIC_PAYWAY_API || 'http://localhost:3000',
  },
};
export default nextConfig;
