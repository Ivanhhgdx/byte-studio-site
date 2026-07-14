const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.add("motion-ready");

const pageProgress = document.createElement("div");
pageProgress.className = "page-progress";
pageProgress.setAttribute("aria-hidden", "true");
document.body.prepend(pageProgress);

let pageProgressFrame = 0;

const updatePageProgress = () => {
  const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
  pageProgress.style.setProperty("--page-progress", progress.toFixed(4));
  pageProgressFrame = 0;
};

const requestPageProgressUpdate = () => {
  if (pageProgressFrame) return;
  pageProgressFrame = window.requestAnimationFrame(updatePageProgress);
};

window.addEventListener("scroll", requestPageProgressUpdate, { passive: true });
window.addEventListener("resize", requestPageProgressUpdate);
window.addEventListener("load", requestPageProgressUpdate, { once: true });
updatePageProgress();

const innerRevealSelectors = [
  ".inner-page .page-hero .section-shell > *",
  ".inner-page .service-catalog .section-shell > .section-index",
  ".inner-page .service-catalog-grid article",
  ".inner-page .detail-grid > *",
  ".inner-page .story-grid > *",
  ".inner-page .rule-list article",
  ".inner-page .process-detail article",
  ".inner-page .formats-grid article",
  ".inner-page .page-cta .section-shell > *",
];

document.querySelectorAll(innerRevealSelectors.join(",")).forEach((element) => {
  if (!element.hasAttribute("data-reveal")) {
    element.setAttribute("data-reveal", "");
  }
});

document.querySelectorAll("[data-stagger]").forEach((group) => {
  group.querySelectorAll(":scope > [data-reveal]").forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${index * 80}ms`);
  });
});

const revealElements = document.querySelectorAll("[data-reveal]");

if (reducedMotion) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  revealElements.forEach((element, index) => {
    if (!element.style.getPropertyValue("--reveal-delay")) {
      element.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 60}ms`);
    }
    revealObserver.observe(element);
  });
}

document.querySelectorAll("[data-video-player]").forEach((player) => {
  const video = player.querySelector("[data-video]");
  const toggle = player.querySelector("[data-video-toggle]");
  const progress = player.querySelector("[data-video-progress]");
  const mute = player.querySelector("[data-video-mute]");
  const fullscreen = player.querySelector("[data-video-fullscreen]");

  if (!video || !toggle || !progress) return;

  const toggleIcon = toggle.querySelector("span");
  const muteIcon = mute?.querySelector("span");
  const fullscreenIcon = fullscreen?.querySelector("span");
  const canAutoHideControls = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let controlsTimer = 0;
  let controlsHaveKeyboardFocus = false;

  const clearControlsTimer = () => {
    if (!controlsTimer) return;
    window.clearTimeout(controlsTimer);
    controlsTimer = 0;
  };

  const hideControls = () => {
    controlsTimer = 0;
    if (!canAutoHideControls || video.paused || video.ended || controlsHaveKeyboardFocus) return;
    player.classList.add("is-controls-hidden");
  };

  const showControls = ({ scheduleHide = true } = {}) => {
    clearControlsTimer();
    player.classList.remove("is-controls-hidden");

    if (canAutoHideControls && scheduleHide && !video.paused && !video.ended) {
      controlsTimer = window.setTimeout(hideControls, 1800);
    }
  };

  const setButtonState = () => {
    const isPlaying = !video.paused && !video.ended;
    toggle.setAttribute("aria-label", isPlaying ? "Поставить видео на паузу" : "Воспроизвести видео");
    toggleIcon.classList.toggle("video-icon-play", !isPlaying);
    toggleIcon.classList.toggle("video-icon-pause", isPlaying);

    if (isPlaying) {
      showControls();
    } else {
      showControls({ scheduleHide: false });
    }
  };

  const setMuteState = () => {
    if (!mute || !muteIcon) return;

    const isMuted = video.muted || video.volume === 0;
    mute.setAttribute("aria-label", isMuted ? "Включить звук" : "Выключить звук");
    muteIcon.classList.toggle("video-icon-sound", !isMuted);
    muteIcon.classList.toggle("video-icon-muted", isMuted);
  };

  const setFullscreenState = () => {
    if (!fullscreen || !fullscreenIcon) return;

    const isFullscreen = document.fullscreenElement === player || document.webkitFullscreenElement === player;
    fullscreen.setAttribute("aria-label", isFullscreen ? "Закрыть полноэкранный режим" : "Открыть видео на весь экран");
    fullscreenIcon.classList.toggle("video-icon-fullscreen", !isFullscreen);
    fullscreenIcon.classList.toggle("video-icon-compress", isFullscreen);
  };

  const setProgress = () => {
    const ratio = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    const value = Math.min(Math.max(ratio, 0), 100);
    progress.value = value;
    progress.style.setProperty("--video-progress", `${value}%`);
  };

  const togglePlayback = () => {
    if (video.paused || video.ended) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    video.muted = !video.muted;
    setMuteState();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      document.exitFullscreen?.();
      document.webkitExitFullscreen?.();
      return;
    }

    if (player.requestFullscreen) {
      player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  };

  toggle.addEventListener("click", togglePlayback);
  video.addEventListener("click", togglePlayback);
  player.addEventListener("pointerdown", () => {
    controlsHaveKeyboardFocus = false;
  });
  player.addEventListener("keydown", () => {
    controlsHaveKeyboardFocus = true;
  });
  player.addEventListener("pointermove", () => showControls());
  player.addEventListener("pointerleave", () => {
    if (!video.paused && !video.ended) {
      clearControlsTimer();
      controlsTimer = window.setTimeout(hideControls, 300);
    }
  });
  player.addEventListener("focusin", () => showControls({ scheduleHide: false }));
  player.addEventListener("focusout", () => {
    controlsHaveKeyboardFocus = false;
    showControls();
  });
  mute?.addEventListener("click", toggleMute);
  fullscreen?.addEventListener("click", toggleFullscreen);
  video.addEventListener("play", setButtonState);
  video.addEventListener("pause", setButtonState);
  video.addEventListener("ended", setButtonState);
  video.addEventListener("volumechange", setMuteState);
  video.addEventListener("timeupdate", setProgress);
  video.addEventListener("loadedmetadata", setProgress);
  document.addEventListener("fullscreenchange", setFullscreenState);
  document.addEventListener("webkitfullscreenchange", setFullscreenState);

  progress.addEventListener("input", () => {
    if (!video.duration) return;
    video.currentTime = (Number(progress.value) / 100) * video.duration;
    setProgress();
  });

  setButtonState();
  setMuteState();
  setFullscreenState();
  setProgress();
});

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector("button[type='submit']");

  if (!form.reportValidity()) return;

  button.classList.add("is-sent");
  button.querySelector("span:first-child").textContent = "Напишите в Telegram";
  status.textContent = "Чтобы мы точно получили задачу, отправьте сообщение напрямую в Telegram.";
});

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector(".comparison-range");
  if (!range) return;

  const updateComparison = () => {
    const value = Number(range.value);
    comparison.style.setProperty("--comparison-position", `${value}%`);

    if (value < 35) {
      range.setAttribute("aria-valuetext", `Преимущественно показана старая версия: ${100 - value}%`);
    } else if (value > 65) {
      range.setAttribute("aria-valuetext", `Преимущественно показана новая версия: ${value}%`);
    } else {
      range.setAttribute("aria-valuetext", `Старая версия ${100 - value}%, новая версия ${value}%`);
    }
  };

  range.addEventListener("input", updateComparison);
  updateComparison();
});
