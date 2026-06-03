import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devtoolsJson from "vite-plugin-devtools-json";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@qb\/(.+)$/,
        replacement: fileURLToPath(new URL("./app/modules/$1", import.meta.url)),
      },
    ],
  },
  ssr: {
    noExternal: [
      // "@radix-ui",
      // "react-icons",
      // "framer-motion",
      // "@apollo/client",
      // "posthog-js",
      // "posthog-js/react",
    ],
  },
  server: {
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      clientPort: 443,
    },
  },
  plugins: [
    devtoolsJson(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
