const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A service card expands into a focused detail sheet and returns to its source.
const capabilityDialog = document.querySelector('#capability-dialog');
if (capabilityDialog) {
  const offerings = [
    {
      title: 'Ваше предложение.<br>Понятно с первого экрана.',
      intro: 'Собираем путь от первого знакомства до обращения: что вы предлагаете, кому это подходит и почему стоит выбрать вас.',
      tasks: ['Запустить сайт новой компании или услуги', 'Показать товары, цены и ответы на вопросы', 'Обновить сайт, которым неудобно пользоваться'],
      result: 'Структура, тексты на основе ваших материалов, дизайн и страницы для телефона и компьютера. Формы и интеграции включаем в согласованный объём.',
      example: 'Например, сайт услуги: предложение → преимущества → примеры → ответы на вопросы → заявка.',
      link: './services.html#websites',
    },
    {
      title: 'Меньше переписки.<br>Больше понятных действий.',
      intro: 'Помогаем клиенту получить ответ, оставить заявку или оформить запрос в привычном мессенджере. Начинаем с одного полезного сценария.',
      tasks: ['Собрать обращение и передать его команде', 'Показать услуги и ответы на частые вопросы', 'Организовать запрос на запись или уведомления'],
      result: 'Понятное меню, согласованная логика диалога и передача данных ответственному. Оплату, CRM и дополнительные сценарии обсуждаем отдельно.',
      example: 'Например, бот для записи: выбор услуги → контакт → пожелание по времени → уведомление администратору.',
      link: './services.html#telegram',
    },
    {
      title: 'Рутина — системе.<br>Внимание — вашему делу.',
      intro: 'Собираем рабочие инструменты вокруг конкретного процесса: чтобы заявки, статусы и нужные данные были под рукой.',
      tasks: ['Дать клиентам доступ к заявкам и статусам', 'Собрать задачи команды в одном месте', 'Связать сервисы или добавить ИИ в отдельный этап'],
      result: 'Первая рабочая версия для выбранного процесса, согласованные роли и доступы. Возможность интеграций проверяем до старта; сложные решения остаются под контролем человека.',
      example: 'Например, обработка заявки: форма → список обращений → ответственный → статус → уведомление.',
      link: './services.html#systems',
    },
  ];
  const sheet = capabilityDialog.querySelector('.capability-sheet');
  const content = capabilityDialog.querySelector('.capability-dialog-content');
  const closeButton = capabilityDialog.querySelector('.capability-close');
  let source = null;
  let closing = false;
  let animations = [];
  let savedOverflow = '';
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const cancelAnimations = () => {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };
  const sourceTransform = () => {
    const from = source.closest('article').getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
  };
  const finishClose = () => {
    cancelAnimations();
    capabilityDialog.classList.remove('is-open');
    capabilityDialog.close();
    document.body.style.overflow = savedOverflow;
    source?.focus({ preventScroll: true });
    closing = false;
  };
  const close = async () => {
    if (!capabilityDialog.open || closing) return;
    closing = true;
    const currentTransform = getComputedStyle(sheet).transform;
    const currentOpacity = getComputedStyle(sheet).opacity;
    cancelAnimations();
    capabilityDialog.classList.remove('is-open');
    if (reducedMotion) return finishClose();
    const transform = sourceTransform();
    animations.push(content.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 160, fill: 'forwards' }));
    const collapse = sheet.animate([
      { transform: currentTransform, opacity: currentOpacity, borderRadius: '30px' },
      { transform, opacity: 0, borderRadius: '8px' },
    ], { duration: 520, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' });
    animations.push(collapse);
    await collapse.finished.catch(() => {});
    finishClose();
  };
  document.querySelectorAll('[data-capability]').forEach((button) => {
    button.addEventListener('click', () => {
      if (capabilityDialog.open) return;
      const offering = offerings[Number(button.dataset.capability)];
      source = button;
      content.innerHTML = `
        <h2 id="capability-dialog-title">${offering.title}</h2>
        <p class="capability-intro">${offering.intro}</p>
        <div class="capability-detail-grid">
          <div><h3>Когда это полезно</h3><ul>${offering.tasks.map((task) => `<li>${task}</li>`).join('')}</ul></div>
          <div><h3>Что получаете</h3><p>${offering.result}</p></div>
        </div>
        <p class="capability-example">${offering.example}</p>
        <div class="capability-actions"><a class="primary-button" href="#contact" data-capability-contact><span>Обсудить задачу</span><span aria-hidden="true">↗</span></a><a class="capability-detail-link" href="${offering.link}">Подробнее об услуге ↗</a></div>
        <p class="capability-footnote">Состав работ, стоимость и срок фиксируем до договора.</p>`;
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      capabilityDialog.showModal();
      sheet.scrollTop = 0;
      const transform = sourceTransform();
      capabilityDialog.classList.add('is-open');
      if (!reducedMotion) {
        animations.push(sheet.animate([
          { transform, opacity: 0.35, borderRadius: '8px' },
          { transform: 'none', opacity: 1, borderRadius: '30px' },
        ], { duration: 850, easing }));
        content.querySelectorAll(':scope > *').forEach((element, index) => {
          animations.push(element.animate([
            { opacity: 0, transform: 'translateY(24px)' },
            { opacity: 1, transform: 'none' },
          ], { duration: 650, delay: 140 + index * 45, easing, fill: 'backwards' }));
        });
      }
    });
  });
  closeButton.addEventListener('click', close);
  capabilityDialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  capabilityDialog.addEventListener('click', (event) => {
    if (event.target === capabilityDialog) close();
    if (event.target.closest('[data-capability-contact]')) finishClose();
  });
}

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
    element.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 95}ms`);
  });
});

const revealElements = document.querySelectorAll("[data-reveal]");

const getRevealStyle = (element) => {
  if (element.matches(".section-heading, .contact-heading, .about-copy, .page-hero .section-shell > *")) return "heading";
  if (element.matches("figure, .comparison-card, .project-visual, .case-row")) return "media";
  if (element.matches("article, li, .home-service-list a, .pricing-more, form")) return "card";
  return "soft";
};

revealElements.forEach((element, index) => {
  const siblings = Array.from(element.parentElement?.children || []).filter((item) => item.hasAttribute("data-reveal"));
  const siblingIndex = Math.max(siblings.indexOf(element), 0);
  const direction = siblingIndex % 2 === 0 ? -1 : 1;

  element.dataset.revealStyle = getRevealStyle(element);
  element.style.setProperty("--reveal-x", `${direction * Math.min(12 + siblingIndex * 3, 24)}px`);
  element.style.setProperty("--reveal-rotate", `${direction * 0.45}deg`);

  if (!element.style.getPropertyValue("--reveal-delay")) {
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
  }
});

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
      threshold: 0.14,
      rootMargin: "0px 0px -4% 0px",
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
}

// Animate words on the same rendered line together; keep inline links and emphasis intact.
const initLineReveal = () => {
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const selector = [
    '.inner-page main p:not(.section-index):not(.detail-number):not(.detail-label):not(.starter-price)',
    '.inner-page main li', '.process-detail small', '.section-lead', '.about-text',
    '.home-service-list a > p', '.home-tasks article > p', '.home-process li > p',
    '.capability-grid li', '.pricing-grid article > span',
    '.concept-layout > div > p:not(.section-index)', '.trust-grid h3'
  ].join(',');
  const pending = new Set();
  const measure = (element) => {
    let top = null;
    let line = -1;
    element.querySelectorAll('.line-word').forEach((word) => {
      const nextTop = word.offsetTop;
      if (top === null || Math.abs(nextTop - top) > 3) {
        top = nextTop;
        line += 1;
      }
      word.style.setProperty('--line-delay', `${Math.min(line, 12) * 105}ms`);
    });
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      measure(target);
      target.classList.add('lines-visible');
      pending.delete(target);
      observer.unobserve(target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -9% 0px' });
  document.querySelectorAll(selector).forEach((element) => {
    if (element.closest('[data-line-reveal]') || !element.textContent.trim()) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
        else {
          const word = document.createElement('span');
          word.className = 'line-word';
          word.textContent = part;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    element.setAttribute('data-line-reveal', '');
    // Avoid competing block transforms and blur over the line animation.
    let host = element;
    while (host && host !== document.body) {
      if (host.hasAttribute('data-reveal')) host.classList.add('line-reveal-host');
      host = host.parentElement;
    }
    measure(element);
    pending.add(element);
    observer.observe(element);
  });
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => pending.forEach(measure));
  }, { passive: true });
};
// Keep text readable while fonts load and when motion is disabled.
if (document.fonts) document.fonts.ready.then(initLineReveal);
else initLineReveal();

document.querySelectorAll("[data-video-player]").forEach((player) => {
  const video = player.querySelector("[data-video]");
  const surface = player.querySelector("[data-video-surface]");
  const toggle = player.querySelector("[data-video-toggle]");
  const progress = player.querySelector("[data-video-progress]");
  const mute = player.querySelector("[data-video-mute]");
  const fullscreen = player.querySelector("[data-video-fullscreen]");

  if (!video || !toggle || !progress) return;

  const toggleIcon = toggle.querySelector(".video-icon");
  const muteIcon = mute?.querySelector("span");
  const fullscreenIcon = fullscreen?.querySelector("span");
  const canAutoHideControls = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let controlsTimer = 0;
  let controlsHaveKeyboardFocus = false;
  let lastInteractionWasPointer = false;
  let controlsWereHiddenOnPointerDown = false;

  const clearControlsTimer = () => {
    if (!controlsTimer) return;
    window.clearTimeout(controlsTimer);
    controlsTimer = 0;
  };

  const hideControls = ({ force = false } = {}) => {
    controlsTimer = 0;
    if ((!canAutoHideControls && !force) || (!force && (video.paused || video.ended || controlsHaveKeyboardFocus))) return;
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
      setLoadingState(false);
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

  const setLoadingState = (isLoading) => {
    player.classList.toggle("is-loading", isLoading);
    toggle.toggleAttribute("aria-busy", isLoading);
  };

  const toggleControls = () => {
    if (controlsWereHiddenOnPointerDown) {
      showControls({ scheduleHide: false });
    } else {
      clearControlsTimer();
      hideControls({ force: true });
    }
  };

  const togglePlayback = () => {
    if (video.paused || video.ended) {
      setLoadingState(true);
      video.play().catch(() => setLoadingState(false));
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
  surface?.addEventListener("pointerdown", () => {
    controlsWereHiddenOnPointerDown = player.classList.contains("is-controls-hidden");
  });
  surface?.addEventListener("click", toggleControls);
  player.addEventListener("pointerdown", () => {
    lastInteractionWasPointer = true;
    controlsHaveKeyboardFocus = false;
  });
  player.addEventListener("keydown", () => {
    lastInteractionWasPointer = false;
    controlsHaveKeyboardFocus = true;
  });
  player.addEventListener("pointermove", (event) => {
    lastInteractionWasPointer = true;
    controlsHaveKeyboardFocus = false;
    if (canAutoHideControls && event.pointerType === "mouse") showControls();
  });
  player.addEventListener("pointerleave", () => {
    if (!video.paused && !video.ended) {
      clearControlsTimer();
      controlsTimer = window.setTimeout(hideControls, 300);
    }
  });
  player.addEventListener("focusin", () => {
    controlsHaveKeyboardFocus = !lastInteractionWasPointer;
    showControls({ scheduleHide: !controlsHaveKeyboardFocus });
  });
  player.addEventListener("focusout", () => {
    lastInteractionWasPointer = false;
    controlsHaveKeyboardFocus = false;
    showControls();
  });
  mute?.addEventListener("click", toggleMute);
  fullscreen?.addEventListener("click", toggleFullscreen);
  video.addEventListener("play", setButtonState);
  video.addEventListener("pause", setButtonState);
  video.addEventListener("ended", setButtonState);
  video.addEventListener("loadstart", () => {
    if (!video.paused) setLoadingState(true);
  });
  video.addEventListener("waiting", () => setLoadingState(true));
  video.addEventListener("stalled", () => {
    if (!video.paused) setLoadingState(true);
  });
  video.addEventListener("playing", () => setLoadingState(false));
  video.addEventListener("canplay", () => setLoadingState(false));
  video.addEventListener("error", () => setLoadingState(false));
  video.addEventListener("volumechange", setMuteState);
  video.addEventListener("timeupdate", setProgress);
  video.addEventListener("loadedmetadata", setProgress);
  document.addEventListener("fullscreenchange", setFullscreenState);
  document.addEventListener("webkitfullscreenchange", setFullscreenState);

  const videoVisibilityObserver = new IntersectionObserver(
    ([entry]) => {
      const isFullscreen = document.fullscreenElement === player || document.webkitFullscreenElement === player;
      if (!isFullscreen && entry.intersectionRatio < 0.2 && !video.paused && !video.ended) {
        video.pause();
      }
    },
    { threshold: [0, 0.2, 0.5] }
  );

  videoVisibilityObserver.observe(player);

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

const contactEndpoint = "https://bite-studio-leads.fyyyyybebl2.workers.dev";

const leadRequestLabels = {
  project: "Оценка проекта",
  concept: "Бесплатный первый экран",
  support: "Доработка или поддержка",
  partner: "Партнёрство",
};

const buildLeadMessage = (data, locationHref) => {
  const date = String(data.get("launch_date") || "");
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join(".") : "Не указана";
  const url = new URL(locationHref);
  const referral = String(url.searchParams.get("ref") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  return [
    `Тема: ${leadRequestLabels[data.get("request_type")] || leadRequestLabels.project}`,
    `Срок запуска: ${data.get("urgency") === "urgent" ? "Срочный запуск" : "Стандартный срок"}`,
    `Желаемая дата: ${dateLabel}`,
    ...(referral ? [`Код партнёра: ${referral}`] : []),
    "",
    String(data.get("message") || "").slice(0, 2400),
  ].join("\n");
};

document.querySelectorAll("[data-request-type]").forEach((link) => {
  link.addEventListener("click", () => {
    const kind = link.dataset.requestType;
    if (!leadRequestLabels[kind]) return;
    const select = document.querySelector("select[name=request_type]");
    if (select) select.value = kind;
    else {
      const target = new URL(link.href);
      target.searchParams.set("request", kind);
      link.href = target.href;
    }
  });
});

const requestSelect = document.querySelector("select[name=request_type]");
const requestedType = new URL(window.location.href).searchParams.get("request");
if (requestSelect && leadRequestLabels[requestedType]) requestSelect.value = requestedType;
const launchDateInput = document.querySelector("input[name=launch_date]");
if (launchDateInput) {
  const today = new Date();
  launchDateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

document.querySelector("[data-contact-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector("button[type='submit']");
  const buttonLabel = button.querySelector("span:first-child");

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  button.disabled = true;
  buttonLabel.textContent = "Отправляем…";
  status.textContent = "";

  try {
    const response = await fetch(contactEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        contact: data.get("contact"),
        message: buildLeadMessage(data, window.location.href),
        website: data.get("website"),
        source: window.location.origin + window.location.pathname,
      }),
    });

    if (!response.ok) throw new Error("Request failed");

    form.reset();
    button.classList.add("is-sent");
    buttonLabel.textContent = "Заявка отправлена";
    status.textContent = "Спасибо! Заявка получена. Отвечаем с 10:00 до 22:00 МСК в течение 30 минут, вне этого времени — в течение 24 часов.";
  } catch {
    button.disabled = false;
    buttonLabel.textContent = "Повторить отправку";
    status.textContent = "Не удалось отправить заявку. Попробуйте ещё раз или позвоните: +7 (950) 989-64-67.";
  }
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
