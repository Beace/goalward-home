import "./styles.css";

type Lang = "zh" | "en";

const COPY: Record<
  Lang,
  { title: string; description: string; social: string; locale: string }
> = {
  zh: {
    title: "Goalward — 把模糊的方向写成可以完成的目标",
    description:
      "Goalward 是免费、开源的 macOS 桌面应用。目标助手把你的方向整理成预期成果和成功标准，任务交给本机已有的编程 Agent 执行。数据留在这台 Mac 上。",
    social: "免费、开源的 macOS 桌面应用。目标助手整理成果和成功标准，任务由你本机的编程 Agent 执行。",
    locale: "zh_CN",
  },
  en: {
    title: "Goalward — turn a vague direction into a goal you can finish",
    description:
      "Goalward is a free, open-source macOS desktop app. A goal assistant turns a direction into an outcome and success criteria. Tasks run on the local coding agents you already have. Data stays on the Mac.",
    social:
      "A free, open-source macOS app. A goal assistant clarifies the outcome and success criteria. Tasks run on local coding agents.",
    locale: "en_US",
  },
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function currentLang(): Lang {
  return document.documentElement.dataset.lang === "en" ? "en" : "zh";
}

function setMeta(selector: string, content: string): void {
  document.querySelector(selector)?.setAttribute("content", content);
}

function applyLanguage(lang: Lang, persist: boolean): void {
  const copy = COPY[lang];
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.lang = lang;
  document.title = copy.title;
  setMeta('meta[name="description"]', copy.description);
  setMeta('meta[property="og:title"]', copy.title);
  setMeta('meta[property="og:description"]', copy.social);
  setMeta('meta[property="og:locale"]', copy.locale);
  setMeta('meta[name="twitter:title"]', copy.title);
  setMeta('meta[name="twitter:description"]', copy.social);
  document.querySelectorAll<HTMLButtonElement>("[data-set-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.setLang === lang ? "true" : "false");
  });
  document.querySelectorAll<HTMLImageElement>("[data-alt-zh]").forEach((image) => {
    const alt = lang === "zh" ? image.dataset.altZh : image.dataset.altEn;
    if (alt) image.alt = alt;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-label-zh]").forEach((button) => {
    const open = button.getAttribute("aria-expanded") === "true";
    const label = open
      ? lang === "zh"
        ? button.dataset.openZh
        : button.dataset.openEn
      : lang === "zh"
        ? button.dataset.labelZh
        : button.dataset.labelEn;
    if (label) button.setAttribute("aria-label", label);
  });
  applyShots();
  if (persist) {
    try {
      localStorage.setItem("goalward-lang", lang);
    } catch {
      /* Private mode can reject storage; the current page still switches. */
    }
  }
}

function dmgUrl(version: string): string {
  return `https://releases.goalward.dev/v${version}/Goalward_${version}_macos-universal.dmg`;
}

function applyVersion(version: string): void {
  const href = dmgUrl(version);
  document.querySelectorAll<HTMLAnchorElement>("a.js-download").forEach((link) => {
    link.href = href;
  });
  document.querySelectorAll<HTMLElement>(".js-version").forEach((node) => {
    node.textContent = version;
  });
  const script = document.querySelector<HTMLScriptElement>("#software-jsonld");
  if (!script?.textContent) return;
  try {
    const data = JSON.parse(script.textContent) as { softwareVersion?: string; downloadUrl?: string };
    data.softwareVersion = version;
    data.downloadUrl = href;
    script.textContent = JSON.stringify(data);
  } catch {
    /* Leave the static fallback in place. */
  }
}

async function readLatest(): Promise<string | null> {
  const sources = ["/api/latest.json", "https://releases.goalward.dev/latest.json"];
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-cache" });
      if (!response.ok) continue;
      const payload = (await response.json()) as { version?: unknown };
      if (typeof payload.version === "string" && VERSION_PATTERN.test(payload.version)) {
        return payload.version;
      }
    } catch {
      /* Try the next source. The HTML keeps the static version if both fail. */
    }
  }
  return null;
}

function setupFaq(): void {
  document.querySelectorAll<HTMLButtonElement>(".faq-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const panel = item?.querySelector<HTMLElement>(".faq-panel");
      if (!item || !panel) return;
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      item.classList.toggle("open", willOpen);
      panel.setAttribute("aria-hidden", willOpen ? "false" : "true");
      if (willOpen) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");
    });
  });
}

function setupReveal(): void {
  const nodes = [...document.querySelectorAll<HTMLElement>(".reveal")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof IntersectionObserver === "undefined") {
    nodes.forEach((node) => node.classList.add("is-in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );
  nodes.forEach((node) => observer.observe(node));
}

function setupNavMenu(): void {
  const nav = document.querySelector<HTMLElement>(".nav");
  const button = document.querySelector<HTMLButtonElement>(".nav-menu");
  const sheet = document.querySelector<HTMLElement>("#nav-sheet");
  if (!nav || !button || !sheet) return;
  const query = window.matchMedia("(max-width: 640px)");
  const items = () =>
    [...sheet.querySelectorAll<HTMLElement>("a, button")].filter((item) => !item.hasAttribute("disabled"));

  const label = () => {
    const lang = currentLang();
    const open = button.getAttribute("aria-expanded") === "true";
    const text = open
      ? lang === "zh"
        ? button.dataset.openZh
        : button.dataset.openEn
      : lang === "zh"
        ? button.dataset.labelZh
        : button.dataset.labelEn;
    if (text) button.setAttribute("aria-label", text);
  };

  const close = (restore: boolean) => {
    if (!nav.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    if (query.matches) {
      sheet.setAttribute("aria-hidden", "true");
      sheet.setAttribute("inert", "");
    }
    label();
    if (restore) button.focus();
  };

  const open = () => {
    nav.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    sheet.setAttribute("aria-hidden", "false");
    sheet.removeAttribute("inert");
    label();
    items()[0]?.focus();
  };

  const sync = () => {
    if (!query.matches) {
      nav.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      sheet.removeAttribute("aria-hidden");
      sheet.removeAttribute("inert");
      label();
      return;
    }
    const openNow = nav.classList.contains("is-open");
    sheet.setAttribute("aria-hidden", openNow ? "false" : "true");
    sheet.toggleAttribute("inert", !openNow);
    label();
  };

  button.addEventListener("click", () => {
    if (nav.classList.contains("is-open")) close(false);
    else open();
  });
  sheet.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => close(false));
  });
  document.addEventListener("keydown", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "Tab") return;
    const list = [button, ...items()];
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.shiftKey ? (index - 1 + list.length) % list.length : (index + 1) % list.length;
    list[next]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (!(event.target instanceof Node) || nav.contains(event.target)) return;
    close(false);
  });
  query.addEventListener("change", sync);
  sync();
}

function setupScroller(): void {
  const scroller = document.querySelector<HTMLElement>(".scenario-scroller");
  if (!scroller) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-scroll]");

  const updateButtons = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    buttons.forEach((button) => {
      const direction = Number(button.dataset.scroll);
      const atEnd = direction > 0 ? scroller.scrollLeft >= max - 4 : scroller.scrollLeft <= 4;
      button.disabled = atEnd;
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.scroll) || 1;
      scroller.scrollBy({
        left: direction * 304,
        behavior: reduce ? "auto" : "smooth",
      });
    });
  });

  scroller.addEventListener("scroll", updateButtons, { passive: true });
  updateButtons();
  window.addEventListener("resize", updateButtons);

  let pointerId: number | null = null;
  let startX = 0;
  let startScroll = 0;
  let dragged = false;

  scroller.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScroll = scroller.scrollLeft;
    dragged = false;
    scroller.setPointerCapture(event.pointerId);
  });
  scroller.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 5) dragged = true;
    scroller.scrollLeft = startScroll - delta;
  });
  const release = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
  };
  scroller.addEventListener("pointerup", release);
  scroller.addEventListener("pointercancel", release);
  scroller.addEventListener("click", (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  });
  scroller.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    scroller.scrollBy({ left: direction * 304, behavior: reduce ? "auto" : "smooth" });
  });
}

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem("goalward-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyShots(): void {
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const lang = currentLang();
  document.querySelectorAll<HTMLAnchorElement>("[data-shot]").forEach((link) => {
    const name = link.dataset.shot;
    if (!name) return;
    const base = `/screenshots/${name}-${theme}-${lang}`;
    link.href = `${base}-1536.webp`;
    const avif = link.querySelector<HTMLSourceElement>('source[data-kind="avif"]');
    const webp = link.querySelector<HTMLSourceElement>('source[data-kind="webp"]');
    if (avif) avif.srcset = `${base}-768.avif 768w, ${base}-1024.avif 1024w, ${base}-1536.avif 1536w`;
    if (webp) webp.srcset = `${base}-768.webp 768w, ${base}-1024.webp 1024w, ${base}-1536.webp 1536w`;
    const image = link.querySelector("img");
    if (image) {
      image.src = `${base}-1536.webp`;
      image.srcset = `${base}-768.webp 768w, ${base}-1024.webp 1024w, ${base}-1536.webp 1536w`;
    }
  });
}

function applyTheme(theme: Theme, persist: boolean): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const color = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  document.querySelectorAll<HTMLButtonElement>("[data-set-theme]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.setTheme === theme ? "true" : "false");
  });
  applyShots();
  if (persist) {
    try {
      localStorage.setItem("goalward-theme", theme);
    } catch {
      /* Private mode can reject storage; the current page still switches. */
    }
  }
}

function setupTheme(): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(storedTheme() ?? systemTheme(), false);
  media.addEventListener("change", () => {
    if (!storedTheme()) applyTheme(systemTheme(), false);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.setTheme === "dark" ? "dark" : "light", true);
    });
  });
}

applyLanguage(currentLang(), false);
setupTheme();
setupFaq();
setupReveal();
setupNavMenu();
setupScroller();

document.querySelectorAll<HTMLButtonElement>("[data-set-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    const lang = button.dataset.setLang === "en" ? "en" : "zh";
    applyLanguage(lang, true);
  });
});

scheduleLatest();

function scheduleLatest(): void {
  const run = () => {
    void readLatest().then((version) => {
      if (version) applyVersion(version);
    });
  };
  window.addEventListener(
    "load",
    () => {
      window.requestIdleCallback(run, { timeout: 2000 });
    },
    { once: true },
  );
}
