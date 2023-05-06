/** @type {import('next').NextConfig} */
const conf = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/github",
        destination: "https://github.com/Nutlope/twitterbio",
        permanent: false,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com/templates/next.js/twitter-bio",
        permanent: false,
      },
    ];
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // layers: true,
  },
  transpilePackages: ['antd-mobile'],
  webpack(config, { isServer, dev }) {
    // Enable webassembly
    config.experiments = { asyncWebAssembly: true, layers: true };

    // In prod mode and in the server bundle (the place where this "chunks" bug
    // appears), use the client static directory for the same .wasm bundle
    config.output.webassemblyModuleFilename =
      isServer && !dev ? "../static/wasm/[id].wasm" : "static/wasm/[id].wasm";

    // Ensure the filename for the .wasm bundle is the same on both the client
    // and the server (as in any other mode the ID's won't match)
    config.optimization.moduleIds = "named";
    config.resolve = {
      ...config.resolve,
      fallback: {
        async_hooks: false,
      },
    }

    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          // fixes proxy-agent dependencies
          net: false,
          stream: false,
          dns: false,
          tls: false,
          assert: false,
          // fixes next-i18next dependencies
          path: false,
          fs: false,
          // fixes mapbox dependencies
          events: false,
          // fixes sentry dependencies
          process: false
        }
      }
    }

    return config;
  },
};

module.exports = conf;
