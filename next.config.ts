import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    // Allow images that resolve to private IPs (for development with picsum.photos)
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // 排除某些包的打包，让它们在 Node.js 环境中直接运行
  // 解决 Turbopack 无法正确处理 worker threads 和动态 require 的问题
  serverExternalPackages: [
    'pino',
    'thread-stream',
    '@ffprobe-installer/ffprobe',
    'formidable',
    'wechatpay-node-v3',
    'superagent',
  ],
};

export default nextConfig;
