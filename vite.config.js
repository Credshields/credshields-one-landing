import { defineConfig } from 'vite';
import { resolve } from 'path';

const pages = [
  'index',
  'about',
  'platform',
  'services',
  'contact',
  'careers',
  'security',
  'privacy',
  'terms',
  'docs',
  'labs',
  'buyers-guide',
  'case-studies',
  'compare',
  'exploit-registry',
  'faq',
  'methodology',
  'trust',
  'api-pentest',
  'cloud-config-pentest',
  'llm-pentest',
  'mobile-app-pentest',
];

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [p, resolve(__dirname, `${p}.html`)])
      ),
    },
  },
});
