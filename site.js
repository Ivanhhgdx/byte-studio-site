const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.add("motion-ready");

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

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector("button[type='submit']");

  if (!form.reportValidity()) return;

  button.classList.add("is-sent");
  button.querySelector("span:first-child").textContent = "Заявка подготовлена";
  status.textContent = "Форма работает как заглушка. Отправка в Telegram будет подключена после настройки бота.";
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
