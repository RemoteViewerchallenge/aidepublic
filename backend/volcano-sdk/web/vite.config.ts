import mdx from "@mdx-js/rollup";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

import { rehypeCleanIds } from "./src/lib/rehype-clean-ids";
import { remarkDirectiveToComponent } from "./src/lib/remark-directive-to-component";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [
          remarkFrontmatter,
          remarkGfm,
          remarkDirective,
          remarkDirectiveToComponent,
        ],
        rehypePlugins: [rehypeSlug, rehypeCleanIds],
      }),
    },
    react({
      include: /\.(jsx|js|mdx|md|tsx|ts)$/,
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
