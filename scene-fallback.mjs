// A renderer/context failure must never hide the offer or its links.
export function bootParticleScene(initialize, document) {
  try {
    initialize();
    return true;
  } catch {
    const hero = document.querySelector('.hero');
    const stage = document.querySelector('.hero-stage');
    const scene = document.querySelector('.scene-wrap');
    const copy = document.querySelector('.hero-copy');
    if (hero) hero.dataset.sceneStatus = 'fallback';
    if (scene) scene.style.display = 'none';
    if (stage) {
      stage.style.setProperty('--copy-opacity', '1');
      stage.style.setProperty('--copy-y', '0px');
      stage.style.setProperty('--copy-scale', '1');
      stage.style.setProperty('--copy-events', 'auto');
    }
    if (copy) {
      copy.style.opacity = '1';
      copy.style.transform = 'translateX(-50%)';
      copy.style.pointerEvents = 'auto';
    }
    return false;
  }
}
