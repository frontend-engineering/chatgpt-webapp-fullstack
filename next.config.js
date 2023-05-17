/** @type {import('next').NextConfig} */
// const SSRPlugin = require("next/dist/build/webpack/plugins/nextjs-ssr-import")
//   .default;
// const { dirname, relative, resolve, join } = require("path");

const conf = {
  reactStrictMode: false,
  swcMinify: true,
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
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (isServer) {
      config.output.webassemblyModuleFilename =
        '../static/wasm/[modulehash].wasm';
    } else {
      config.output.webassemblyModuleFilename =
        'static/wasm/[modulehash].wasm';
    }

    // Unfortunately there isn't an easy way to override the replacement function body, so we 
    // have to just replace the whole plugin `apply` body.
    function patchSsrPlugin(plugin) {
      plugin.apply = function apply(compiler) {
        compiler.hooks.compilation.tap("NextJsSSRImport", compilation => {
          compilation.mainTemplate.hooks.requireEnsure.tap(
            "NextJsSSRImport",
            (code, chunk) => {
              // This is the block that fixes https://github.com/vercel/next.js/issues/22581
              if (!chunk.name) {
                return;
              }

              // Update to load chunks from our custom chunks directory
              const outputPath = resolve("/");
              const pagePath = join("/", dirname(chunk.name));
              const relativePathToBaseDir = relative(pagePath, outputPath);
              // Make sure even in windows, the path looks like in unix
              // Node.js require system will convert it accordingly
              const relativePathToBaseDirNormalized = relativePathToBaseDir.replace(
                /\\/g,
                "/"
              );
              return code
                .replace(
                  'require("./"',
                  `require("${relativePathToBaseDirNormalized}/"`
                )
                .replace(
                  "readFile(join(__dirname",
                  `readFile(join(__dirname, "${relativePathToBaseDirNormalized}"`
                );
            }
          );
        });
      };
    }

    // In prod mode and in the server bundle (the place where this "chunks" bug
    // appears), use the client static directory for the same .wasm bundle
    // config.output.webassemblyModuleFilename =
    //   isServer && !dev ? "../static/wasm/[id].wasm" : "static/wasm/[id].wasm";

    // Ensure the filename for the .wasm bundle is the same on both the client
    // and the server (as in any other mode the ID's won't match)
    // config.optimization.moduleIds = "named";
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
