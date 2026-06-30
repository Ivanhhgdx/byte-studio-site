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
    element.style.setProperty("--reveal-delay", `${index * 120}ms`);
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
      threshold: 0.16,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  revealElements.forEach((element, index) => {
    if (!element.style.getPropertyValue("--reveal-delay")) {
      element.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 70}ms`);
    }
    revealObserver.observe(element);
  });
}

const progressBar = document.createElement("div");
progressBar.className = "scroll-progress";
progressBar.setAttribute("aria-hidden", "true");
document.body.append(progressBar);

const parallaxElements = document.querySelectorAll(
  ".section-heading h2, .contact-heading h2, .inner-page .page-hero h1"
);

parallaxElements.forEach((element) => element.classList.add("motion-parallax"));

let scrollFrame = 0;

function updateScrollMotion() {
  scrollFrame = 0;
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pageProgress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  progressBar.style.transform = `scaleX(${pageProgress})`;

  if (reducedMotion) return;

  parallaxElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const viewportProgress = (rect.top + rect.height * 0.5) / window.innerHeight;
    const offset = Math.max(-28, Math.min(28, (0.5 - viewportProgress) * 42));
    element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  });
}

function requestScrollMotion() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(updateScrollMotion);
}

window.addEventListener("scroll", requestScrollMotion, { passive: true });
window.addEventListener("resize", requestScrollMotion, { passive: true });
updateScrollMotion();

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
