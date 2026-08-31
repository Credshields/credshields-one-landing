import { initScene } from './ai-defense-scene.js';

const canvas = document.getElementById('hero-globe-canvas');

if (canvas && window.THREE) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = initScene(canvas);
  let visible = true;

  // Keep the scene in its opening shield state. The source module also contains
  // a scroll-driven keyhole dive and security stack that are not used here.
  scene.setScroll(0, -1.2);

  function syncMotion() {
    scene.setMotion(visible && !document.hidden && !reducedMotion.matches ? 1 : 0);
  }

  function updatePointer(event) {
    scene.setMouse(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * 2 - 1,
    );
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  }, { threshold: 0.05 });

  visibilityObserver.observe(canvas);
  window.addEventListener('mousemove', updatePointer, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();

  window.addEventListener('pagehide', () => {
    visibilityObserver.disconnect();
    window.removeEventListener('mousemove', updatePointer);
    document.removeEventListener('visibilitychange', syncMotion);
    reducedMotion.removeEventListener('change', syncMotion);
    scene.dispose();
  }, { once: true });
}
