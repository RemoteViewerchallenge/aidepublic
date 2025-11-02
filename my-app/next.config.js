/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Fix workspace root warning
  outputFileTracingRoot: __dirname,

  // Enhanced CSP for Monaco Editor
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "style-src 'self' 'unsafe-inline' data: blob:",
              "font-src 'self' data: blob: https:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' http://localhost:3000 http://localhost:3001 ws://localhost:3001 ws://localhost:3000",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self' blob:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Optimized webpack config for Monaco Editor
  webpack: (config, { isServer, dev }) => {
    // Monaco Editor optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        assert: false,
        url: false,
      };

      // Optimize Monaco Editor loading
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      });

      // Better chunk splitting for Monaco
      if (!dev) {
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            monaco: {
              test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
              name: 'monaco',
              chunks: 'all',
              priority: 30,
            },
          },
        };
      }
    }

    return config;
  },

  // Environment variables
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  },

  // Better image optimization
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
};

module.exports = nextConfig;
