import test from "node:test";
import assert from "node:assert/strict";
import { createRenderSizeSync, createSceneRuntime } from "../scene-runtime.mjs";

function fixture() {
  const win = new EventTarget();
  const doc = new EventTarget();
  const canvas = new EventTarget();
  doc.hidden = false;
  doc.documentElement = { dataset: {} };
  const queue = new Map();
  let next = 1;
  win.requestAnimationFrame = fn => { const id = next++; queue.set(id, fn); return id; };
  win.cancelAnimationFrame = id => queue.delete(id);
  let enabled = true;
  let disposals = 0;
  const rendered = [];
  const sizes = [];
  const runtime = createSceneRuntime({
    window: win, document: doc, canvas, canAnimate: () => enabled,
    resize: force => sizes.push(force), render: (...args) => rendered.push(args),
    suspend() {}, dispose() { disposals++; },
  });
  function event(target, type, persisted) {
    const event = new Event(type, { cancelable: true });
    event.persisted = persisted;
    target.dispatchEvent(event);
    return event;
  }
  function tick(time) {
    const callbacks = [...queue.values()];
    queue.clear();
    callbacks.forEach(fn => fn(time));
  }
  return { win, doc, canvas, runtime, queue, rendered, sizes, event, tick,
    setEnabled(value) { enabled = value; runtime.sync(); },
    get disposals() { return disposals; } };
}

test("repeated Safari page-cache returns keep one live loop and do not dispose the scene", () => {
  const f = fixture();
  f.runtime.sync(); f.tick(0); f.tick(16);
  for (let i = 1; i <= 3; i++) {
    const before = f.runtime.elapsed;
    f.event(f.win, "pagehide", true);
    assert.equal(f.queue.size, 0);
    assert.equal(f.disposals, 0);
    f.event(f.win, "pageshow", true);
    f.runtime.sync();
    assert.equal(f.queue.size, 1);
    f.tick(i * 100000);
    assert.equal(f.runtime.elapsed, before);
    f.tick(i * 100000 + 16);
    assert.ok(f.runtime.elapsed > before);
    assert.equal(f.doc.documentElement.dataset.sceneAnimation, "running");
  }
  f.event(f.win, "pagehide", false);
  f.event(f.win, "pageshow", false);
  assert.equal(f.disposals, 1);
  assert.equal(f.queue.size, 0);
});

test("background tabs, hidden hero and video pause simulation without a time jump", () => {
  const f = fixture();
  f.runtime.sync(); f.tick(100); f.tick(116);
  const before = f.runtime.elapsed;
  f.doc.hidden = true; f.event(f.doc, "visibilitychange");
  f.tick(1000000);
  f.doc.hidden = false; f.event(f.doc, "visibilitychange");
  f.tick(2000000);
  assert.equal(f.runtime.elapsed, before);
  f.setEnabled(false);
  assert.equal(f.queue.size, 0);
  f.setEnabled(true); f.tick(3000000);
  assert.equal(f.runtime.elapsed, before);
  f.tick(4000000);
  assert.ok(f.runtime.elapsed - before <= 1 / 30 + 1e-10);
});

test("WebGL context restoration resizes and resumes without duplicate frames", () => {
  const f = fixture();
  f.runtime.sync(); f.tick(0);
  assert.equal(f.event(f.canvas, "webglcontextlost").defaultPrevented, true);
  assert.equal(f.queue.size, 0);
  f.runtime.sync();
  assert.equal(f.queue.size, 0);
  f.event(f.canvas, "webglcontextrestored");
  assert.equal(f.queue.size, 1);
  assert.equal(f.sizes.at(-1), true);
  assert.equal(f.disposals, 0);
});

test("render size follows layout and DPR even without a window resize event", () => {
  const canvas = { clientWidth: 1280, clientHeight: 720, width: 300, height: 150,
    getBoundingClientRect() { throw new Error("Do not measure the scaled CSS layer"); } };
  const gl = { drawingBufferWidth: 300, drawingBufferHeight: 150, isContextLost: () => false };
  let calls = 0;
  let dpr = 2;
  let pointRatio = 0;
  const renderer = { getContext: () => gl, setDrawingBufferSize(w, h, ratio) {
    calls++;
    gl.drawingBufferWidth = canvas.width = Math.floor(w * ratio);
    gl.drawingBufferHeight = canvas.height = Math.floor(h * ratio);
  } };
  const sync = createRenderSizeSync(renderer, canvas, (w, h, ratio) => pointRatio = ratio, () => dpr);
  sync();
  assert.deepEqual([canvas.width, canvas.height, pointRatio], [2560, 1440, 2]);
  sync(); sync();
  assert.equal(calls, 1, "normal frames do not reallocate the canvas");
  // A stale backing store would enlarge and soften points when composited to the CSS size.
  gl.drawingBufferWidth = 1280; gl.drawingBufferHeight = 720;
  sync();
  assert.equal(gl.drawingBufferHeight, 1440);
  assert.equal(calls, 2);
  dpr = 1; sync();
  assert.deepEqual([canvas.width, canvas.height, pointRatio], [1280, 720, 1]);
  canvas.clientWidth = 390; canvas.clientHeight = 844; dpr = 3; sync();
  assert.deepEqual([canvas.width, canvas.height, pointRatio], [780, 1688, 2]);
  canvas.clientHeight = 0; sync();
  assert.equal(canvas.height, 1688);
});
