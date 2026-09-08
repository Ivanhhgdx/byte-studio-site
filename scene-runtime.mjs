// Keep CSS pixels, the WebGL backing store and point sizes in the same scale.
export function createRenderSizeSync(renderer, canvas, onSize, getDpr) {
  let lastWidth = 0;
  let lastHeight = 0;
  let lastRatio = 0;
  const gl = renderer.getContext();

  return function syncSize(force = false) {
    // getBoundingClientRect includes the scroll effect's CSS transform.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0 || gl.isContextLost()) return;
    const ratio = Math.min(getDpr() || 1, 2);
    const bufferWidth = Math.floor(width * ratio);
    const bufferHeight = Math.floor(height * ratio);
    const changed = width !== lastWidth || height !== lastHeight || ratio !== lastRatio;
    const invalidBuffer = canvas.width !== bufferWidth || canvas.height !== bufferHeight ||
      gl.drawingBufferWidth !== bufferWidth || gl.drawingBufferHeight !== bufferHeight;

    if (!force && !changed && !invalidBuffer) return;
    renderer.setDrawingBufferSize(width, height, ratio);
    lastWidth = width;
    lastHeight = height;
    lastRatio = ratio;
    onSize(width, height, gl.drawingBufferHeight / height);
  };
}

export function createSceneRuntime({
  window: win, document: doc, canvas, canAnimate, resize, render, suspend, dispose,
}) {
  let frame = null;
  let lastTime = null;
  let elapsed = 0;
  let pageHidden = false;
  let contextLost = false;
  let destroyed = false;

  function canRun() {
    return !destroyed && !pageHidden && !contextLost && !doc.hidden && canAnimate();
  }

  function pause() {
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    doc.documentElement.dataset.sceneAnimation = "paused";
    suspend();
  }

  function tick(time) {
    frame = null;
    if (!canRun()) { pause(); return; }
    // Simulation time excludes time spent in another tab, page cache or a lost context.
    const delta = lastTime === null ? 0 : Math.min(Math.max(0, (time - lastTime) / 1000), 1 / 30);
    lastTime = time;
    elapsed += delta;
    resize();
    render(delta, elapsed);
    frame = win.requestAnimationFrame(tick);
  }

  function sync() {
    if (!canRun()) { pause(); return; }
    doc.documentElement.dataset.sceneAnimation = "running";
    if (frame === null) {
      resize(true);
      lastTime = null;
      frame = win.requestAnimationFrame(tick);
    }
  }

  function pageHide(event) {
    pageHidden = true;
    pause();
    // A persisted page will return with the same renderer and JS heap.
    if (!event.persisted && !destroyed) {
      destroyed = true;
      dispose();
      win.removeEventListener("pagehide", pageHide);
      win.removeEventListener("pageshow", pageShow);
      doc.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", loseContext);
      canvas.removeEventListener("webglcontextrestored", restoreContext);
    }
  }

  function pageShow() {
    pageHidden = false;
    sync();
  }

  function loseContext(event) {
    event.preventDefault();
    contextLost = true;
    pause();
  }

  function restoreContext() {
    contextLost = false;
    sync();
  }

  win.addEventListener("pagehide", pageHide);
  win.addEventListener("pageshow", pageShow);
  doc.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", loseContext);
  canvas.addEventListener("webglcontextrestored", restoreContext);

  return { sync, get elapsed() { return elapsed; } };
}
