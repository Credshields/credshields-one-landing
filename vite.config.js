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
  'soc2',
  'iso',
  'pci_dss',
  'vapt',
  'cobalt',
  'ai_pentesting',
  'ai_platforms',
  'web_app_pentest',
];

const pageRoutes = new Set(pages);

function rewritePageLinksForStaticHosting() {
  return {
    name: 'rewrite-page-links-for-static-hosting',
    transformIndexHtml(html) {
      return html.replace(
        /(<a\b[^>]*\bhref=)(["'])\/([^"']*)\2/gi,
        (match, prefix, quote, target) => {
          const suffixStart = target.search(/[?#]/);
          const route = suffixStart === -1 ? target : target.slice(0, suffixStart);
          const suffix = suffixStart === -1 ? '' : target.slice(suffixStart);
          const page = route.replace(/\.html$/, '') || 'index';

          if (!pageRoutes.has(page)) return match;

          return `${prefix}${quote}./${page}.html${suffix}${quote}`;
        }
      );
    },
  };
}

export default defineConfig({
  base: '/credshields-one-landing/',
  root: '.',
  publicDir: 'public',
  plugins: [rewritePageLinksForStaticHosting()],
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
