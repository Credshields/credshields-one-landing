import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const pages = [
  'case-studies.html',
  'compare.html',
  'faq.html',
  'methodology.html',
  'trust.html',
];

const indexHtml = fs.readFileSync(indexPath, 'utf8');

function extractBlock(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${label} in index.html`);
  }
  return match[0];
}

function adaptIndexShellForSubpage(html) {
  return html
    .replaceAll('href="#" class="brand"', 'href="index.html" class="brand"')
    .replace(/href="#([^"]+)"/g, 'href="index.html#$1"');
}

const nav = adaptIndexShellForSubpage(
  extractBlock(indexHtml, /<!-- NAV -->\s*<nav class="site">[\s\S]*?<\/nav>/, 'nav')
);
const footer = adaptIndexShellForSubpage(
  extractBlock(indexHtml, /<!-- FOOTER -->\s*<footer>[\s\S]*?<\/footer>/, 'footer')
);

const shellCss = `

/* Synced index nav/footer shell */
.brand-logo { height: 46px; width: auto; display: block; }
.brand-logo--dark { display: none; }
.nav-toggle {
  display: none;
  background: transparent;
  border: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  cursor: pointer;
  position: relative;
}
.nav-toggle span {
  position: absolute;
  left: 8px;
  width: 24px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: top 0.25s var(--ease), transform 0.25s var(--ease), opacity 0.2s var(--ease), background 0.2s var(--ease);
}
.nav-toggle span:nth-child(1) { top: 14px; }
.nav-toggle span:nth-child(2) { top: 19px; }
.nav-toggle span:nth-child(3) { top: 24px; }
nav.site.is-open .nav-toggle span:nth-child(1) { top: 19px; transform: rotate(45deg); }
nav.site.is-open .nav-toggle span:nth-child(2) { opacity: 0; }
nav.site.is-open .nav-toggle span:nth-child(3) { top: 19px; transform: rotate(-45deg); }
.nav-cta-mobile { display: none; }
.nav-dropdown { position: relative; }
.nav-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.nav-dropdown-trigger svg {
  width: 12px;
  height: 12px;
  transition: transform 0.2s var(--ease);
}
.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  min-width: 220px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border-green);
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(46, 125, 14, 0.12), 0 4px 14px rgba(10, 26, 12, 0.06);
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.18s var(--ease), transform 0.18s var(--ease), visibility 0s linear 0.18s;
  z-index: 50;
}
.nav-dropdown-menu::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 14px;
}
.nav-dropdown-menu a {
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dim);
  white-space: nowrap;
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}
.nav-dropdown-menu a:hover {
  background: var(--green-wash);
  color: var(--text);
}
.nav-dropdown:hover > .nav-dropdown-menu,
.nav-dropdown:focus-within > .nav-dropdown-menu {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
  transition: opacity 0.18s var(--ease), transform 0.18s var(--ease), visibility 0s linear 0s;
}
.nav-dropdown:hover > .nav-dropdown-trigger svg,
.nav-dropdown:focus-within > .nav-dropdown-trigger svg {
  transform: rotate(180deg);
}
.foot-col button {
  color: var(--text-dim);
  font-size: 14px;
  transition: color 0.2s var(--ease);
  text-align: left;
}
.foot-col button:hover { color: var(--green); }
@media (max-width: 960px) {
  .nav-toggle { display: block; }
  nav.site .nav-cta { display: none; }
  nav.site ul {
    display: flex;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    gap: 0;
    padding: 8px 24px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 18px 40px rgba(10, 26, 12, 0.08);
    transform: translateY(-8px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0s linear 0.2s;
  }
  nav.site.is-open ul {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0s linear 0s;
  }
  nav.site ul li {
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }
  nav.site ul li:last-child { border-bottom: 0; }
  nav.site ul a { display: block; padding: 10px 0; font-size: 15px; }
  .nav-dropdown-menu {
    position: static;
    transform: none;
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0 0 4px 14px;
    min-width: 0;
    display: none;
    flex-direction: column;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .nav-dropdown.is-expanded > .nav-dropdown-menu { display: flex; }
  .nav-dropdown-menu::before { display: none; }
  .nav-dropdown-menu a { padding: 8px 0; font-size: 14px; white-space: normal; }
  .nav-dropdown:hover > .nav-dropdown-menu,
  .nav-dropdown:focus-within > .nav-dropdown-menu { transform: none; }
  .nav-dropdown:hover > .nav-dropdown-trigger svg,
  .nav-dropdown:focus-within > .nav-dropdown-trigger svg { transform: none; }
  .nav-dropdown.is-expanded .nav-dropdown-trigger svg { transform: rotate(180deg); }
  .nav-cta-mobile {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 14px;
    padding: 12px 18px;
    background: var(--lime);
    color: var(--text);
    border: 1px solid var(--lime);
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
  }
  .nav-cta-mobile svg { width: 14px; height: 14px; }
}
/* End synced index nav/footer shell */
`;

const shellJs = `
<script>
/* Synced index nav/footer shell */
(function () {
  var nav = document.querySelector('nav.site');
  var btn = document.querySelector('.nav-toggle');
  if (nav && btn) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('ul a, ul button').forEach(function (a) {
      if (a.classList.contains('nav-dropdown-trigger')) return;
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    nav.querySelectorAll('.nav-dropdown-trigger').forEach(function (trig) {
      trig.addEventListener('click', function (e) {
        if (window.matchMedia('(max-width: 960px)').matches) {
          e.preventDefault();
          var expanded = trig.parentElement.classList.toggle('is-expanded');
          trig.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
      });
    });
  }

  document.querySelectorAll('[data-request-access]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (typeof window.openRequestModal === 'function') return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      window.location.href = '/request-access';
    });
  });
})();
/* End synced index nav/footer shell */
</script>
`;

function upsertMarkedBlock(html, block, startMarker, endMarker, beforePattern) {
  const existing = new RegExp(`\\n?${startMarker}[\\s\\S]*?${endMarker}\\n?`);
  html = html.replace(existing, '\n');
  const index = html.lastIndexOf(beforePattern);
  if (index === -1) {
    throw new Error(`Could not find insertion point ${beforePattern}`);
  }
  return html.slice(0, index) + block + html.slice(index);
}

for (const page of pages) {
  const pagePath = path.join(root, page);
  let html = fs.readFileSync(pagePath, 'utf8');

  if (!/<nav class="site">[\s\S]*?<\/nav>/.test(html)) {
    throw new Error(`Could not find nav in ${page}`);
  }
  if (!/<footer>[\s\S]*?<\/footer>/.test(html)) {
    throw new Error(`Could not find footer in ${page}`);
  }

  html = html.replace(/<nav class="site">[\s\S]*?<\/nav>/, nav);
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, footer);
  html = upsertMarkedBlock(
    html,
    shellCss,
    '/\\* Synced index nav/footer shell \\*/',
    '/\\* End synced index nav/footer shell \\*/',
    '</style>'
  );
  html = upsertMarkedBlock(
    html,
    shellJs,
    '<script>\\n/\\* Synced index nav/footer shell \\*/',
    '/\\* End synced index nav/footer shell \\*/\\n</script>',
    '</body>'
  );

  fs.writeFileSync(pagePath, html);
  console.log(`Synced ${page}`);
}
