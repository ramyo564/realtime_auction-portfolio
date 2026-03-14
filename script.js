const analyticsSession = {
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  pageType: "portfolio",
  pageStartedAt: Date.now(),
  visibleStartedAt: document.visibilityState === "hidden" ? 0 : Date.now(),
  visibleDurationMs: 0,
  maxScrollPercent: 0,
  ended: false,
  currentSectionId: "portfolio_page",
};

function pushDataLayerEvent(payload) {
  if (!payload || typeof payload !== "object") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function detectLinkType(href) {
  const target = String(href || "")
    .trim()
    .toLowerCase();
  if (!target) return "unknown";
  if (target.startsWith("mailto:")) return "mailto";
  if (target.startsWith("#")) return "anchor";
  if (target.startsWith("http://") || target.startsWith("https://"))
    return "external";
  return "internal";
}

function inferDestinationPageType(destinationUrl) {
  const raw = String(destinationUrl || "").trim();
  if (!raw) return "";

  const linkType = detectLinkType(raw);
  if (linkType === "anchor") return analyticsSession.pageType;
  if (linkType === "mailto") return "contact";
  if (linkType === "external") return "external";

  let parsedUrl;
  try {
    parsedUrl = new URL(raw, window.location.href);
  } catch {
    return analyticsSession.pageType;
  }

  const normalizedPath = String(parsedUrl.pathname || "").toLowerCase();
  if (!normalizedPath || normalizedPath === "/")
    return analyticsSession.pageType;
  if (
    normalizedPath === "/portfolio/" ||
    normalizedPath === "/portfolio/index.html" ||
    normalizedPath === "/portfolio"
  ) {
    return "portfolio_hub";
  }
  if (
    normalizedPath.includes("-portfolio") ||
    normalizedPath.includes("/docs/")
  ) {
    return "portfolio";
  }
  return analyticsSession.pageType;
}

function trackSelectContent({
  contentType,
  itemId,
  itemName,
  sectionName,
  interactionAction = "click",
  elementType,
  elementLabel,
  linkUrl,
  linkType,
  modalName,
  value,
  sourceEvent = "ui_click",
  ...extra
}) {
  const resolvedDestinationUrl = String(
    linkUrl || extra.destination_url || "",
  ).trim();
  const payload = {
    event: "select_content",
    tracking_version: "2026-03-ga4-unified-v1",
    session_id: analyticsSession.id,
    page_path: window.location.pathname,
    page_title: document.title,
    page_type: analyticsSession.pageType,
    source_page_type: analyticsSession.pageType,
    content_type: contentType || "unknown",
    item_id: itemId || "unknown",
    section_name: sectionName || "unknown",
    interaction_action: interactionAction,
    source_event: sourceEvent,
  };

  if (itemName) payload.item_name = itemName;
  if (elementType) payload.element_type = elementType;
  if (elementLabel) payload.element_label = elementLabel;
  if (linkType) payload.link_type = linkType;
  if (resolvedDestinationUrl) {
    payload.link_url = resolvedDestinationUrl;
    if (!payload.link_type) {
      payload.link_type = detectLinkType(resolvedDestinationUrl);
    }
    payload.destination_url = resolvedDestinationUrl;
    payload.destination_page_type = inferDestinationPageType(
      resolvedDestinationUrl,
    );
  }
  if (modalName) payload.modal_name = modalName;
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value !== Infinity &&
    value !== -Infinity
  )
    payload.value = value;

  Object.entries(extra).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      payload[key] = val;
    }
  });

  pushDataLayerEvent(payload);
}

function readScrollPercent() {
  const documentElement = document.documentElement;
  const maxScrollable = Math.max(
    0,
    documentElement.scrollHeight - window.innerHeight,
  );
  if (maxScrollable <= 0) return 100;
  const ratio = (window.scrollY / maxScrollable) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

function updateMaxScrollPercent() {
  analyticsSession.maxScrollPercent = Math.max(
    analyticsSession.maxScrollPercent,
    readScrollPercent(),
  );
}

function stopVisibleTimer(timestamp = Date.now()) {
  if (!analyticsSession.visibleStartedAt) return;
  analyticsSession.visibleDurationMs += Math.max(
    0,
    timestamp - analyticsSession.visibleStartedAt,
  );
  analyticsSession.visibleStartedAt = 0;
}

function startVisibleTimer(timestamp = Date.now()) {
  if (
    document.visibilityState === "hidden" ||
    analyticsSession.visibleStartedAt
  )
    return;
  analyticsSession.visibleStartedAt = timestamp;
}

function endAnalyticsSession(reason = "pagehide") {
  if (analyticsSession.ended) return;
  analyticsSession.ended = true;

  updateMaxScrollPercent();
  stopVisibleTimer();

  const totalDurationMs = Math.max(
    0,
    Date.now() - analyticsSession.pageStartedAt,
  );
  const visibleDurationMs = Math.min(
    totalDurationMs,
    analyticsSession.visibleDurationMs,
  );
  const hiddenDurationMs = Math.max(0, totalDurationMs - visibleDurationMs);

  trackSelectContent({
    contentType: "page_engagement",
    itemId: "portfolio_page",
    itemName: document.title || "Portfolio",
    sectionName: "lifecycle",
    interactionAction: "end",
    elementType: "page",
    elementLabel: "PAGE_END",
    sourceEvent: "lifecycle",
    duration_ms: totalDurationMs,
    engagement_time_msec: visibleDurationMs,
    hidden_duration_ms: hiddenDurationMs,
    max_scroll_percent: analyticsSession.maxScrollPercent,
    page_type: "portfolio",
    end_reason: reason,
    value: Math.round(visibleDurationMs / 1000),
  });
}

function setupAnalyticsLifecycle() {
  updateMaxScrollPercent();

  trackSelectContent({
    contentType: "page_engagement",
    itemId: "portfolio_page",
    itemName: document.title || "Portfolio",
    sectionName: "lifecycle",
    interactionAction: "start",
    elementType: "page",
    elementLabel: "PAGE_START",
    sourceEvent: "lifecycle",
    page_type: "portfolio",
  });

  window.addEventListener("scroll", updateMaxScrollPercent, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (analyticsSession.ended) return;

    if (document.visibilityState === "hidden") {
      stopVisibleTimer();
      trackSelectContent({
        contentType: "page_visibility",
        itemId: "portfolio_page",
        itemName: document.title || "Portfolio",
        sectionName: "lifecycle",
        interactionAction: "hidden",
        elementType: "page",
        elementLabel: "PAGE_HIDDEN",
        sourceEvent: "lifecycle",
        page_type: "portfolio",
      });
      return;
    }

    startVisibleTimer();
    trackSelectContent({
      contentType: "page_visibility",
      itemId: "portfolio_page",
      itemName: document.title || "Portfolio",
      sectionName: "lifecycle",
      interactionAction: "visible",
      elementType: "page",
      elementLabel: "PAGE_VISIBLE",
      sourceEvent: "lifecycle",
      page_type: "portfolio",
    });
  });

  window.addEventListener("pagehide", () => endAnalyticsSession("pagehide"));
  window.addEventListener("beforeunload", () =>
    endAnalyticsSession("beforeunload"),
  );
}

// Ensure lifecycle is initialized
document.addEventListener("DOMContentLoaded", () => {
  setupAnalyticsLifecycle();
});

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
import { templateConfig } from "./config.js";

const baseMermaidConfig = {
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "linear",
  },
};

const mermaidConfig = {
  ...baseMermaidConfig,
  ...(templateConfig.mermaid ?? {}),
  flowchart: {
    ...baseMermaidConfig.flowchart,
    ...(templateConfig.mermaid?.flowchart ?? {}),
  },
};

mermaid.initialize(mermaidConfig);

let mermaidRenderSequence = 0;

async function renderMermaidContainer(container, options = {}) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const shouldForce = Boolean(options?.force);
  if (!shouldForce && container.querySelector("svg")) {
    return;
  }

  // Mermaid 재렌더 시 이전 처리 상태가 남아 있으면 raw text만 남을 수 있어 초기화합니다.
  container.removeAttribute("data-processed");

  const mermaidId = container.getAttribute("data-mermaid-id") || "";
  const diagrams = templateConfig.diagrams ?? {};
  if (mermaidId && diagrams[mermaidId]) {
    container.innerHTML = diagrams[mermaidId];
  } else {
    const label = toSafeLabel(mermaidId || "undefined_id");
    container.innerHTML = `
            graph TD
            A[${label}] --> B[Define templateConfig.diagrams entry]
        `;
  }

  mermaidRenderSequence += 1;
  const tempClass = `mermaid-reflow-target-${mermaidRenderSequence}`;
  container.classList.add(tempClass);
  try {
    await mermaid.run({ querySelector: `.${tempClass}` });
  } catch (error) {
    console.error("Mermaid re-render failed for node:", container, error);
    const failedId = container.getAttribute("data-mermaid-id") || "unknown";
    container.innerHTML = `<p style="margin:0;color:#ffb4b4;">Diagram render failed: ${failedId}</p>`;
  } finally {
    container.classList.remove(tempClass);
  }
}

function rerenderVisibleCardDiagrams(entries, options = {}) {
  const force = Boolean(options?.force);
  const candidates = Array.isArray(entries)
    ? entries
        .map((entry) =>
          entry?.element instanceof HTMLElement ? entry.element : null,
        )
        .filter(Boolean)
        .filter((element) => !element.hidden)
        .map((element) => element.querySelector(".mermaid"))
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => force || !node.querySelector("svg"))
    : [];

  if (candidates.length === 0) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      (async () => {
        for (const container of candidates) {
          // Mermaid 내부 상태 충돌을 피하기 위해 순차적으로 렌더합니다.
          // eslint-disable-next-line no-await-in-loop
          await renderMermaidContainer(container, { force: true });
        }
      })();
    });
  });
}

function byId(id) {
  return document.getElementById(id);
}

function normalizeHashTarget(target) {
  if (!target) {
    return "#";
  }
  return target.startsWith("#") ? target : `#${target}`;
}

function toSafeLabel(value) {
  return (
    String(value ?? "unknown")
      .replace(/[^a-zA-Z0-9_-]+/g, " ")
      .trim() || "unknown"
  );
}

function setText(id, value) {
  const el = byId(id);
  if (el && value) {
    el.textContent = value;
  }
}

function setupUptime() {
  const uptimeElement = byId("uptime");
  if (!uptimeElement) {
    return;
  }

  const startTime = new Date();
  const updateUptime = () => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const h = Math.floor(diff / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((diff % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    uptimeElement.textContent = `${h}:${m}:${s}`;
  };

  updateUptime();
  setInterval(updateUptime, 1000);
}

function setupMobileNav() {
  const nav = byId("header-nav");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) {
    return;
  }

  const closeNav = () => {
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    nav.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (nav.classList.contains("is-open")) {
      closeNav();
    } else {
      openNav();
    }

    const willClose = nav.classList.contains("is-open") === false;
    trackSelectContent({
      contentType: "navigation",
      itemId: "header_nav_toggle",
      itemName: willClose ? "close" : "open",
      sectionName: "header_nav",
      interactionAction: willClose ? "close" : "open",
      elementType: "button",
      elementLabel: "MOBILE_NAV_TOGGLE",
    });
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.classList.contains("nav-item") ||
        target.classList.contains("nav-sub-item"))
    ) {
      closeNav();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (!nav.contains(target) && !toggle.contains(target)) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeNav();
    }
  });
}

function setSystemInfo() {
  if (templateConfig.system?.documentTitle) {
    document.title = templateConfig.system.documentTitle;
  }
  setText("system-name", templateConfig.system?.systemName);
}

function renderHero() {
  const hero = templateConfig.hero ?? {};
  const section = byId("system-architecture");
  const metrics = byId("hero-metrics");
  const mermaidContainer = byId("hero-mermaid");

  if (section && hero.sectionId) {
    section.id = hero.sectionId;
  }
  setText("hero-panel-title", hero.panelTitle);
  setText("hero-panel-uid", hero.panelUid);

  if (mermaidContainer && hero.diagramId) {
    mermaidContainer.setAttribute("data-mermaid-id", hero.diagramId);
  }

  if (!metrics) {
    return;
  }
  metrics.replaceChildren();
  renderMetricLines(
    metrics,
    hero.metrics,
    "> Add metrics in templateConfig.hero.metrics",
  );
}

function renderMetricLines(container, lines, fallbackText) {
  const metricLines = Array.isArray(lines) ? lines : [];
  if (metricLines.length === 0) {
    const fallback = document.createElement("p");
    fallback.textContent = fallbackText;
    container.appendChild(fallback);
    return;
  }

  metricLines.forEach((line) => {
    const item = document.createElement("p");
    const cleanLine = String(line).replace(/^>\s*/, "");
    item.textContent = `> ${cleanLine}`;
    container.appendChild(item);
  });
}

function createTopPanel(panel, index) {
  const section = document.createElement("section");
  section.className = `panel hero-panel ${panel.panelClass ?? ""}`.trim();
  section.id = panel.sectionId || `top-panel-${index + 1}`;

  const header = document.createElement("div");
  header.className = "panel-header";

  const title = document.createElement("span");
  title.className = "panel-title";
  title.textContent = panel.panelTitle || `TOP_PANEL_${index + 1}`;

  const uid = document.createElement("span");
  uid.className = "panel-uid";
  uid.textContent =
    panel.panelUid || `ID: TOP-${String(index + 1).padStart(2, "0")}`;

  header.append(title, uid);

  const graphContainer = document.createElement("div");
  graphContainer.className = "graph-container";
  const mermaidContainer = document.createElement("div");
  mermaidContainer.className = "mermaid";
  mermaidContainer.setAttribute("data-mermaid-id", panel.diagramId || "");
  graphContainer.appendChild(mermaidContainer);

  const metrics = document.createElement("div");
  metrics.className = "hero-message";
  renderMetricLines(
    metrics,
    panel.metrics,
    "> Add metrics in templateConfig.topPanels",
  );

  section.append(header, graphContainer, metrics);
  return section;
}

function renderTopPanels() {
  const container = byId("top-panels");
  if (!container) {
    return;
  }
  container.replaceChildren();

  const panels = Array.isArray(templateConfig.topPanels)
    ? templateConfig.topPanels
    : [];
  panels.forEach((panel, index) => {
    container.appendChild(createTopPanel(panel, index));
  });
}

function renderSkills() {
  const skillsConfig = templateConfig.skills ?? {};
  const section = byId("skill-set");
  const grid = byId("skill-grid");
  if (!grid) {
    return;
  }

  if (section && skillsConfig.sectionId) {
    section.id = skillsConfig.sectionId;
  }
  setText("skills-panel-title", skillsConfig.panelTitle);
  setText("skills-panel-uid", skillsConfig.panelUid);

  grid.replaceChildren();
  const items = Array.isArray(skillsConfig.items) ? skillsConfig.items : [];

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "skill-card";

    const title = document.createElement("h3");
    title.className = "skill-card-title";
    title.textContent = item.title ?? "CATEGORY";

    const stack = document.createElement("p");
    stack.className = "skill-card-stack";
    stack.textContent = item.stack ?? "";

    card.append(title, stack);
    grid.appendChild(card);
  });
}

function createGroupDivider(group, sectionTheme) {
  const divider = document.createElement("div");
  divider.className = "group-divider";
  divider.setAttribute("data-theme", sectionTheme || "blue");

  const title = document.createElement("span");
  title.className = "group-title";
  title.textContent = group.title ?? "";

  const desc = document.createElement("span");
  desc.className = "group-desc";
  desc.textContent = group.desc ?? "";

  divider.append(title, desc);
  return divider;
}

function createMetaLine(label, value) {
  if (!value) {
    return null;
  }

  const line = document.createElement("p");
  line.className = "card-meta-line";

  const key = document.createElement("span");
  key.className = "meta-label";
  key.textContent = `${label}:`;

  const text = document.createElement("span");
  text.className = "meta-value";
  text.textContent = value;

  line.append(key, text);
  return line;
}

function createNarrativeBlock(label, content, tone) {
  if (!content) {
    return null;
  }

  const block = document.createElement("section");
  block.className = `card-narrative ${tone ? `is-${tone}` : ""}`.trim();

  const heading = document.createElement("h4");
  heading.className = "card-narrative-title";
  heading.textContent = label;

  const body = document.createElement("p");
  body.className = "card-narrative-body";
  body.textContent = content;

  block.append(heading, body);
  return block;
}

function createTagList(tags) {
  const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (normalizedTags.length === 0) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "card-tags";

  normalizedTags.forEach((tag) => {
    const item = document.createElement("span");
    item.className = "card-tag";
    item.textContent = tag;
    wrapper.appendChild(item);
  });

  return wrapper;
}

function createHighlightList(items) {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (normalizedItems.length === 0) {
    return null;
  }

  const list = document.createElement("ul");
  list.className = "card-highlights";
  normalizedItems.forEach((item) => {
    const line = document.createElement("li");
    line.textContent = item;
    list.appendChild(line);
  });
  return list;
}

function createCardLinks(card) {
  const links = Array.isArray(card.links)
    ? card.links.filter((item) => item?.href)
    : [];
  if (links.length === 0 && card.learnMore && card.learnMore !== "#") {
    links.push({ label: card.linkLabel ?? "LEARN MORE", href: card.learnMore });
  }

  if (links.length === 0) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "card-links";

  links.forEach((item) => {
    const link = document.createElement("a");
    link.className = "card-link";
    link.href = item.href;
    link.textContent = item.label || "LINK";
    if (!String(item.href).startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    // GA4 Event Tracking
    link.addEventListener("click", () => {
      trackSelectContent({
        contentType: "case_link",
        itemId: card.title || "unknown_case",
        itemName: card.title || "Case",
        sectionName: "cases",
        interactionAction: "click",
        elementType: "link",
        elementLabel: item.label,
        linkUrl: item.href,
        linkType: "external",
      });
    });

    wrapper.appendChild(link);
  });

  return wrapper;
}

function createServiceCard(card, sectionConfig) {
  const article = document.createElement("article");
  article.className =
    `service-card ${sectionConfig.cardClass ?? ""} ${card.cardClass ?? ""}`.trim();
  if (card.anchorId) {
    article.id = card.anchorId;
  }

  const visual = document.createElement("div");
  visual.className = "card-visual";
  const visualHeight = card.visualHeight || sectionConfig.cardVisualHeight;
  if (visualHeight) {
    visual.style.setProperty("--card-visual-height", visualHeight);
  }

  const mermaidContainer = document.createElement("div");
  mermaidContainer.className = "mermaid";
  mermaidContainer.setAttribute("data-mermaid-id", card.mermaidId ?? "");
  visual.appendChild(mermaidContainer);

  const content = document.createElement("div");
  content.className = "card-content";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = card.title ?? "Card Title";

  const subtitleText = card.subtitle ?? card.period ?? "";
  const subtitle = document.createElement("p");
  subtitle.className = "card-subtitle";
  subtitle.textContent = subtitleText;

  const description = document.createElement("p");
  description.className = "card-desc";
  description.textContent = card.overview ?? card.description ?? "";

  const roleLine = createMetaLine("ROLE", card.role);
  const stackLine = createMetaLine("STACK", card.stackSummary);
  const problemBlock = createNarrativeBlock("문제", card.problem, "problem");
  const solutionBlock = createNarrativeBlock("해결", card.solution, "solution");
  const resultBlock = createNarrativeBlock("결과", card.result, "result");
  const tags = createTagList(card.skills);
  const highlights = createHighlightList(card.highlights);
  const links = createCardLinks(card);

  content.append(title);
  if (subtitleText) {
    content.append(subtitle);
  }
  if (card.businessImpact) {
    const impact = document.createElement("p");
    impact.className = "card-business-impact";
    impact.innerHTML =
      "<strong>🎯 비즈니스 임팩트:</strong> " + card.businessImpact;
    content.append(impact);
  }
  content.append(description);
  if (roleLine) {
    content.append(roleLine);
  }
  if (stackLine) {
    content.append(stackLine);
  }
  if (problemBlock) {
    content.append(problemBlock);
  }
  if (solutionBlock) {
    content.append(solutionBlock);
  }
  if (resultBlock) {
    content.append(resultBlock);
  }
  if (tags) {
    content.append(tags);
  }
  if (highlights) {
    content.append(highlights);
  }
  if (links) {
    content.append(links);
  }
  article.append(visual, content);
  return article;
}

let caseShowcaseControllers = [];

function createSectionRecruiterBrief(sectionConfig) {
  const brief = sectionConfig?.recruiterBrief;
  if (!brief || typeof brief !== "object") {
    return null;
  }

  const quickCases = Array.isArray(brief.cases)
    ? brief.cases
        .map((item) => ({
          id: String(item?.id || "").trim(),
          anchorId: String(item?.anchorId || "").trim(),
          title: String(item?.title || "").trim(),
          problem: String(item?.problem || "").trim(),
          action: String(item?.action || "").trim(),
          impact: String(item?.impact || "").trim(),
        }))
        .filter(
          (item) =>
            item.id || item.title || item.problem || item.action || item.impact,
        )
    : [];

  const bullets = Array.isArray(brief.bullets)
    ? brief.bullets.map((line) => String(line || "").trim()).filter(Boolean)
    : [];

  if (!brief.title && bullets.length === 0 && quickCases.length === 0) {
    return null;
  }

  const wrapper = document.createElement("section");
  wrapper.className = "section-recruiter-brief";

  const kickerText = String(brief.kicker || "").trim();
  if (kickerText) {
    const kicker = document.createElement("p");
    kicker.className = "section-recruiter-kicker";
    kicker.textContent = kickerText;
    wrapper.appendChild(kicker);
  }

  const titleText = String(brief.title || "").trim();
  if (titleText) {
    const title = document.createElement("h3");
    title.className = "section-recruiter-title";
    title.textContent = titleText;
    wrapper.appendChild(title);
  }

  if (quickCases.length > 0) {
    const cardGrid = document.createElement("div");
    cardGrid.className = "section-recruiter-card-grid";

    quickCases.forEach((item) => {
      const card = document.createElement("article");
      card.className = "section-recruiter-card";
      if (item.anchorId) {
        card.setAttribute("data-anchor-id", item.anchorId);
        card.addEventListener("click", () => {
          const targetId = item.anchorId.replace(/^#/, "");
          ensureCaseCardVisible(targetId);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            history.pushState(null, "", `#${targetId}`);
          }
          trackSelectContent({
            contentType: "recruiter_quick_brief_card",
            itemId: item.id || "unknown_case",
            itemName: item.title || "unknown_case",
            sectionName: "recruiter_quick_brief",
            interactionAction: "click_card",
            elementType: "article",
            elementLabel: item.id || "unknown_case",
            linkUrl: `#${targetId}`,
          });
        });
      }

      const idLine = document.createElement("p");
      idLine.className = "section-recruiter-card-id";
      idLine.textContent = item.id || "Case";

      const cardTitle = document.createElement("h4");
      cardTitle.className = "section-recruiter-card-title";
      cardTitle.textContent = item.title || "핵심 변화";

      const createRow = (labelText, valueText) => {
        if (!valueText) {
          return null;
        }
        const row = document.createElement("p");
        row.className = "section-recruiter-card-row";

        const label = document.createElement("span");
        label.className = "section-recruiter-card-key";
        label.textContent = `${labelText}:`;

        const value = document.createElement("span");
        value.className = "section-recruiter-card-value";
        value.textContent = valueText;

        row.append(label, value);
        return row;
      };

      const problemRow = createRow("PROBLEM", item.problem);
      const actionRow = createRow("ACTION", item.action);
      const impactRow = createRow("IMPACT", item.impact);

      card.append(idLine, cardTitle);
      if (problemRow) {
        card.appendChild(problemRow);
      }
      if (actionRow) {
        card.appendChild(actionRow);
      }
      if (impactRow) {
        card.appendChild(impactRow);
      }
      cardGrid.appendChild(card);
    });

    wrapper.appendChild(cardGrid);
  }

  if (bullets.length > 0 && quickCases.length === 0) {
    const list = document.createElement("ul");
    list.className = "section-recruiter-list";
    bullets.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });
    wrapper.appendChild(list);
  }

  const actions = document.createElement("div");
  actions.className = "section-recruiter-actions";
  wrapper.appendChild(actions);

  return wrapper;
}

function renderServiceSections() {
  const container = byId("service-sections");
  if (!container) {
    return;
  }
  container.replaceChildren();
  caseShowcaseControllers = [];

  const sections = Array.isArray(templateConfig.serviceSections)
    ? templateConfig.serviceSections
    : [];
  sections.forEach((sectionConfig) => {
    const sectionWrapper = document.createElement("section");
    sectionWrapper.className = "service-section";
    sectionWrapper.id = sectionConfig.id ?? "";

    const header = document.createElement("div");
    header.className = "section-header";

    const headingWrap = document.createElement("div");
    headingWrap.className = "section-header-main";

    const heading = document.createElement("h2");
    heading.className = "section-title";
    heading.textContent = sectionConfig.title ?? "SERVICES";
    headingWrap.appendChild(heading);

    const sectionLeadText = String(sectionConfig.sectionLead || "").trim();
    if (sectionLeadText) {
      const sectionLead = document.createElement("p");
      sectionLead.className = "section-lead";
      sectionLead.textContent = sectionLeadText;
      headingWrap.appendChild(sectionLead);
    }
    header.appendChild(headingWrap);

    const groupsContainer = document.createElement("div");
    groupsContainer.className = "service-groups";
    const recruiterBrief = createSectionRecruiterBrief(sectionConfig);
    const renderedCards = [];
    const groupCardMap = new Map();
    const recruiterCaseCards = recruiterBrief
      ? Array.from(recruiterBrief.querySelectorAll(".section-recruiter-card"))
      : [];

    const groups =
      Array.isArray(sectionConfig.groups) && sectionConfig.groups.length > 0
        ? sectionConfig.groups
        : [{ title: "", desc: "", cards: sectionConfig.cards ?? [] }];

    groups.forEach((group) => {
      const groupSection = document.createElement("div");
      groupSection.className = "service-group";

      if (group.title || group.desc) {
        groupSection.appendChild(
          createGroupDivider(group, sectionConfig.theme),
        );
      }

      const groupGrid = document.createElement("div");
      groupGrid.className = "service-grid";

      const cards = Array.isArray(group.cards) ? group.cards : [];
      cards.forEach((card) => {
        const cardElement = createServiceCard(card, sectionConfig);
        groupGrid.appendChild(cardElement);

        const anchorId = String(card?.anchorId || cardElement.id || "").trim();
        renderedCards.push({ anchorId, element: cardElement, groupSection });

        if (!groupCardMap.has(groupSection)) {
          groupCardMap.set(groupSection, []);
        }
        groupCardMap.get(groupSection).push(cardElement);
      });

      groupSection.appendChild(groupGrid);
      groupsContainer.appendChild(groupSection);
    });

    const configuredFeaturedAnchors = Array.isArray(
      sectionConfig.featuredCaseAnchors,
    )
      ? sectionConfig.featuredCaseAnchors
          .map((anchorId) => String(anchorId || "").trim())
          .filter(Boolean)
      : [];
    const featuredCountCandidate = Number.parseInt(
      sectionConfig.featuredCaseCount,
      10,
    );
    const featuredCount =
      Number.isFinite(featuredCountCandidate) && featuredCountCandidate > 0
        ? featuredCountCandidate
        : 3;
    let featuredAnchors = configuredFeaturedAnchors.filter((anchorId) =>
      renderedCards.some((entry) => entry.anchorId === anchorId),
    );
    if (featuredAnchors.length === 0) {
      featuredAnchors = renderedCards
        .slice(0, featuredCount)
        .map((entry) => entry.anchorId)
        .filter(Boolean);
    }

    const featuredSet = new Set(featuredAnchors);
    const allAnchorSet = new Set(
      renderedCards.map((entry) => entry.anchorId).filter(Boolean),
    );
    const canCollapse =
      featuredSet.size > 0 && featuredSet.size < renderedCards.length;

    if (canCollapse) {
      const controls = document.createElement("div");
      controls.className = "case-showcase-controls";

      const stateLabel = String(
        sectionConfig.featuredStateLabel ||
          `대표 ${featuredSet.size}건 우선 노출`,
      ).trim();
      const expandLabel = String(
        sectionConfig.featuredToggleLabel ||
          `전체 Case ${renderedCards.length}건 보기`,
      ).trim();
      const collapseLabel = String(
        sectionConfig.featuredCollapseLabel ||
          `대표 Case ${featuredSet.size}건만 보기`,
      ).trim();

      const state = document.createElement("span");
      state.className = "case-showcase-state";

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "case-showcase-toggle";
      toggleButton.setAttribute("aria-expanded", "false");

      let isCollapsed = true;

      const applyVisibility = () => {
        const newlyVisibleEntries = [];
        renderedCards.forEach((entry) => {
          const wasHidden = entry.element.hidden;
          const isVisible = !isCollapsed || featuredSet.has(entry.anchorId);
          entry.element.hidden = !isVisible;
          entry.element.classList.toggle("is-collapsed-hidden", !isVisible);
          if (wasHidden && isVisible) {
            newlyVisibleEntries.push(entry);
          }
        });

        groupCardMap.forEach((cardNodes, groupSection) => {
          const hasVisibleCard = cardNodes.some((cardNode) => !cardNode.hidden);
          groupSection.hidden = !hasVisibleCard;
          groupSection.classList.toggle("is-collapsed-empty", !hasVisibleCard);
        });

        if (recruiterCaseCards.length > 0) {
          recruiterCaseCards.forEach((cardNode) => {
            const anchorId = String(
              cardNode.getAttribute("data-anchor-id") || "",
            ).trim();
            const isVisible =
              !isCollapsed || !anchorId || featuredSet.has(anchorId);
            cardNode.hidden = !isVisible;
            cardNode.classList.toggle("is-collapsed-hidden", !isVisible);
          });
        }

        sectionWrapper.classList.toggle("is-featured-collapsed", isCollapsed);
        const hiddenCount = Math.max(
          0,
          renderedCards.length - featuredSet.size,
        );
        state.textContent = isCollapsed
          ? `${stateLabel} · 현재 ${featuredSet.size}/${renderedCards.length}건 표시 (숨김 ${hiddenCount}건)`
          : `현재 전체 ${renderedCards.length}/${renderedCards.length}건 표시`;
        toggleButton.textContent = isCollapsed ? expandLabel : collapseLabel;
        toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
        if (!isCollapsed) {
          rerenderVisibleCardDiagrams(
            newlyVisibleEntries.length > 0
              ? newlyVisibleEntries
              : renderedCards,
            { force: true },
          );
        }
        window.dispatchEvent(new Event("resize"));
      };

      const setCollapsed = (nextCollapsed, triggerSource = "toggle") => {
        if (isCollapsed === nextCollapsed) {
          return false;
        }

        isCollapsed = nextCollapsed;
        applyVisibility();

        trackSelectContent({
          contentType: "case_showcase_toggle",
          itemId: sectionConfig.id || "service_cases",
          itemName: sectionConfig.title || "CASES",
          sectionName: "service_section",
          interactionAction: isCollapsed ? "collapse" : "expand",
          elementType: "button",
          elementLabel: "CASE_SHOWCASE_TOGGLE",
          value: renderedCards.length,
          trigger_source: triggerSource,
          hidden_count: isCollapsed
            ? Math.max(0, renderedCards.length - featuredSet.size)
            : 0,
          visible_count: isCollapsed ? featuredSet.size : renderedCards.length,
        });
        return true;
      };

      toggleButton.addEventListener("click", () => {
        setCollapsed(!isCollapsed, "toggle_button");
      });

      controls.append(state, toggleButton);
      const recruiterActionMount = recruiterBrief?.querySelector(
        ".section-recruiter-actions",
      );
      if (recruiterActionMount instanceof HTMLElement) {
        recruiterActionMount.appendChild(controls);
      } else {
        header.appendChild(controls);
      }
      applyVisibility();

      caseShowcaseControllers.push({
        sectionId: sectionConfig.id || "",
        revealCase(anchorId, triggerSource = "target_reveal") {
          if (
            !anchorId ||
            !allAnchorSet.has(anchorId) ||
            !isCollapsed ||
            featuredSet.has(anchorId)
          ) {
            return false;
          }
          return setCollapsed(false, triggerSource);
        },
      });
    }

    sectionWrapper.append(header);
    if (recruiterBrief) {
      sectionWrapper.appendChild(recruiterBrief);
    }
    sectionWrapper.appendChild(groupsContainer);
    container.appendChild(sectionWrapper);
  });
}

function ensureCaseCardVisible(targetId) {
  const anchorId = String(targetId || "")
    .replace(/^#/, "")
    .trim();
  if (!anchorId || caseShowcaseControllers.length === 0) {
    return false;
  }

  let revealed = false;
  caseShowcaseControllers.forEach((controller) => {
    if (!controller || typeof controller.revealCase !== "function") {
      return;
    }
    if (controller.revealCase(anchorId, "anchor_navigation")) {
      revealed = true;
    }
  });
  if (revealed) {
    const target = document.getElementById(anchorId);
    if (target) {
      void target.offsetWidth; // trigger reflow
      target.classList.add("target-highlight");
      setTimeout(() => target.classList.remove("target-highlight"), 1200);

      const showcaseId = target.closest(".service-section")?.id || "";
      trackSelectContent({
        contentType: "case_showcase_reveal",
        itemId: anchorId,
        itemName:
          target.querySelector(".card-title")?.textContent?.trim() || anchorId,
        sectionName: "service_section",
        interactionAction: "reveal_target",
        elementType: "article",
        elementLabel: "CASE_REVEALED",
        showcase_id: showcaseId,
      });
    }
  }
  return revealed;
}

function renderContact() {
  const contact = templateConfig.contact ?? {};
  const section = byId("contact");
  const actions = byId("contact-actions");

  if (section && contact.sectionId) {
    section.id = contact.sectionId;
  }
  setText("contact-panel-title", contact.panelTitle);
  setText("contact-panel-uid", contact.panelUid);
  setText("contact-description", contact.description);

  if (!actions) {
    return;
  }
  actions.replaceChildren();

  const items = Array.isArray(contact.actions) ? contact.actions : [];
  items.forEach((item) => {
    const action = document.createElement("a");
    action.className = "action-btn";
    action.href = item.href || "#";
    action.textContent = item.label || "LINK";
    if (!String(item.href || "").startsWith("mailto:")) {
      action.target = "_blank";
      action.rel = "noopener noreferrer";
    }

    action.addEventListener("click", () => {
      trackSelectContent({
        contentType: "contact_action",
        itemId: item.label || "unknown_contact_action",
        itemName: item.label || "LINK",
        sectionName: "contact",
        interactionAction: "open_link",
        elementType: "button",
        elementLabel: item.label || "LINK",
        linkUrl: item.href,
        linkType: detectLinkType(item.href),
      });
    });
    actions.appendChild(action);
  });
}

function buildDefaultNavigation() {
  const items = [];

  const hero = templateConfig.hero ?? {};
  const skills = templateConfig.skills ?? {};
  const contact = templateConfig.contact ?? {};

  items.push({
    label: hero.panelTitle || "SYSTEM_ARCHITECTURE",
    target: normalizeHashTarget(hero.sectionId || "system-architecture"),
  });

  const topPanels = Array.isArray(templateConfig.topPanels)
    ? templateConfig.topPanels
    : [];
  topPanels.forEach((panel, index) => {
    items.push({
      label: panel.navLabel || panel.panelTitle || `TOP_PANEL_${index + 1}`,
      target: normalizeHashTarget(panel.sectionId || `top-panel-${index + 1}`),
    });
  });

  items.push({
    label: skills.panelTitle || "SKILL_SET",
    target: normalizeHashTarget(skills.sectionId || "skill-set"),
  });

  const serviceSections = Array.isArray(templateConfig.serviceSections)
    ? templateConfig.serviceSections
    : [];
  serviceSections.forEach((section) => {
    items.push({
      label: section.navLabel || section.title || section.id || "SERVICES",
      target: normalizeHashTarget(section.id || ""),
    });
  });

  items.push({
    label: contact.panelTitle || "CONTACT",
    target: normalizeHashTarget(contact.sectionId || "contact"),
  });

  return items;
}

function buildCaseNavigationItems(casesTarget) {
  const normalizedCasesTarget = normalizeHashTarget(casesTarget || "cases");
  const sections = Array.isArray(templateConfig.serviceSections)
    ? templateConfig.serviceSections
    : [];
  const casesSection = sections.find(
    (section) =>
      normalizeHashTarget(section.id || "") === normalizedCasesTarget,
  );
  if (!casesSection) {
    return [];
  }

  const groups =
    Array.isArray(casesSection.groups) && casesSection.groups.length > 0
      ? casesSection.groups
      : [{ cards: casesSection.cards ?? [] }];

  const caseItems = [];
  let sequence = 1;
  groups.forEach((group) => {
    const cards = Array.isArray(group.cards) ? group.cards : [];
    cards.forEach((card) => {
      if (!card?.title) {
        return;
      }
      const anchorId = String(card.anchorId || "").trim();
      if (!anchorId) {
        return;
      }
      caseItems.push({
        label: card.title || `Case ${sequence}`,
        target: normalizeHashTarget(anchorId),
      });
      sequence += 1;
    });
  });

  return caseItems;
}

function renderNavigation() {
  const nav = byId("header-nav");
  if (!nav) {
    return;
  }
  nav.replaceChildren();

  const configuredNav =
    Array.isArray(templateConfig.navigation) &&
    templateConfig.navigation.length > 0
      ? templateConfig.navigation
      : buildDefaultNavigation();

  configuredNav.forEach((item) => {
    const normalizedTarget = normalizeHashTarget(item.target);
    const label = String(item.label || "");
    const isCasesMenu =
      Boolean(item.caseMenu) || label.toUpperCase().includes("CASE");
    const caseItems = isCasesMenu
      ? buildCaseNavigationItems(normalizedTarget)
      : [];
    if (caseItems.length > 0) {
      const wrap = document.createElement("div");
      wrap.className = "nav-item-wrap has-submenu";

      const parent = document.createElement("a");
      parent.className = "nav-item nav-parent";
      parent.href = normalizedTarget;
      parent.textContent = item.label || "CASES";
      parent.addEventListener("click", () => {
        trackSelectContent({
          contentType: "navigation",
          itemId: normalizedTarget.replace(/^#/, "") || "unknown_target",
          itemName: parent.textContent || "CASES",
          sectionName: "header_nav",
          interactionAction: "navigate",
          elementType: "link",
          elementLabel: parent.textContent || "CASES",
          linkUrl: normalizedTarget,
          linkType: "anchor",
        });
      });
      wrap.appendChild(parent);

      const submenu = document.createElement("div");
      submenu.className = "nav-submenu";
      caseItems.forEach((caseItem) => {
        const subLink = document.createElement("a");
        subLink.className = "nav-sub-item";
        subLink.href = normalizeHashTarget(caseItem.target);
        subLink.textContent = caseItem.label || "CASE";
        subLink.addEventListener("click", () => {
          const target = normalizeHashTarget(caseItem.target);
          const targetId = target.replace(/^#/, "");
          ensureCaseCardVisible(targetId);
          trackSelectContent({
            contentType: "navigation_case",
            itemId: targetId || "unknown_case_target",
            itemName: caseItem.label || "CASE",
            sectionName: "header_nav",
            interactionAction: "navigate",
            elementType: "link",
            elementLabel: caseItem.label || "CASE",
            linkUrl: target,
            linkType: "anchor",
          });
        });
        submenu.appendChild(subLink);
      });

      wrap.append(submenu);
      nav.appendChild(wrap);
      return;
    }

    const link = document.createElement("a");
    link.className = "nav-item";
    link.href = normalizedTarget;
    link.textContent = item.label || "SECTION";
    nav.appendChild(link);
  });
}

function setupScrollSpy() {
  const nav = byId("header-nav");
  if (!nav) {
    return;
  }

  const links = Array.from(nav.querySelectorAll(".nav-item, .nav-sub-item"));
  if (links.length === 0) {
    return;
  }

  const targetMap = new Map();
  links.forEach((link) => {
    const href = String(link.getAttribute("href") || "");
    if (!href.startsWith("#") || href.length < 2) {
      return;
    }

    const targetId = href.slice(1);
    const targetElement = byId(targetId);
    if (!targetElement) {
      return;
    }

    if (!targetMap.has(targetId)) {
      targetMap.set(targetId, {
        element: targetElement,
        links: [],
      });
    }
    targetMap.get(targetId).links.push(link);
  });

  if (targetMap.size === 0) {
    return;
  }

  const caseWrap = nav.querySelector(".nav-item-wrap.has-submenu");
  const caseParent = caseWrap?.querySelector(".nav-parent") ?? null;
  let sortedTargets = [];
  let currentActiveId = "";
  let rafToken = 0;

  const clearActive = () => {
    links.forEach((link) => link.classList.remove("is-active"));
    if (caseWrap) {
      caseWrap.classList.remove("is-active-group");
    }
  };

  const activateTarget = (targetId) => {
    if (!targetId || currentActiveId === targetId) {
      return;
    }
    currentActiveId = targetId;

    const isCaseCard =
      targetId.startsWith("realtime-auction-case-") ||
      targetId.startsWith("case-") ||
      targetId.includes("-case-");
    const itemName = matched.links[0]?.textContent?.trim() || targetId;

    // Ensure analyticsSession has these sets defined
    analyticsSession.uniqueCaseViews =
      analyticsSession.uniqueCaseViews || new Set();
    analyticsSession.currentSectionId = analyticsSession.currentSectionId || "";
    analyticsSession.currentSectionName =
      analyticsSession.currentSectionName || "";
    analyticsSession.currentSectionEnteredAt =
      analyticsSession.currentSectionEnteredAt || Date.now();

    const durationMs = Math.max(
      0,
      Date.now() - analyticsSession.currentSectionEnteredAt,
    );
    if (durationMs >= 200 && analyticsSession.currentSectionId) {
      trackSelectContent({
        contentType: "section_dwell",
        itemId: analyticsSession.currentSectionId,
        itemName:
          analyticsSession.currentSectionName ||
          analyticsSession.currentSectionId,
        sectionName: "scroll_spy",
        interactionAction: "switch",
        elementType: "section",
        elementLabel:
          analyticsSession.currentSectionName ||
          analyticsSession.currentSectionId,
        duration_ms: durationMs,
        value: Math.round(durationMs / 1000),
      });
    }

    analyticsSession.currentSectionId = targetId;
    analyticsSession.currentSectionName = itemName;
    analyticsSession.currentSectionEnteredAt = Date.now();
    if (isCaseCard) {
      analyticsSession.uniqueCaseViews.add(targetId);
    }

    trackSelectContent({
      contentType: "section_view",
      itemId: targetId,
      itemName,
      sectionName: "scroll_spy",
      interactionAction: "view",
      elementType: "section",
      elementLabel: itemName,
    });
    clearActive();

    const matched = targetMap.get(targetId);
    if (!matched) {
      return;
    }

    matched.links.forEach((link) => link.classList.add("is-active"));
    const hasSubItem = matched.links.some((link) =>
      link.classList.contains("nav-sub-item"),
    );
    if (hasSubItem && caseWrap && caseParent) {
      caseWrap.classList.add("is-active-group");
      caseParent.classList.add("is-active");
    }
  };

  const rebuildTargetOrder = () => {
    sortedTargets = Array.from(targetMap.entries())
      .map(([targetId, payload]) => ({
        targetId,
        top: payload.element.getBoundingClientRect().top + window.scrollY,
      }))
      .sort((left, right) => left.top - right.top);
  };

  const applyByScrollPosition = () => {
    if (sortedTargets.length === 0) {
      return;
    }

    const headerHeight =
      document.querySelector(".status-bar")?.offsetHeight ?? 0;
    const baseline = window.scrollY + headerHeight + 28;
    let activeId = sortedTargets[0].targetId;

    for (let index = 0; index < sortedTargets.length; index += 1) {
      if (baseline >= sortedTargets[index].top) {
        activeId = sortedTargets[index].targetId;
      } else {
        break;
      }
    }

    activateTarget(activeId);
  };

  const scheduleUpdate = () => {
    if (rafToken !== 0) {
      return;
    }
    rafToken = window.requestAnimationFrame(() => {
      rafToken = 0;
      applyByScrollPosition();
    });
  };

  rebuildTargetOrder();
  applyByScrollPosition();

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", () => {
    rebuildTargetOrder();
    scheduleUpdate();
  });
  window.addEventListener("hashchange", scheduleUpdate);

  // Mermaid 렌더 완료 후 레이아웃 높이가 변할 수 있어 보정합니다.
  window.setTimeout(() => {
    rebuildTargetOrder();
    scheduleUpdate();
  }, 160);
  window.setTimeout(() => {
    rebuildTargetOrder();
    scheduleUpdate();
  }, 720);
}

function injectMermaidSources() {
  const nodes = Array.from(document.querySelectorAll(".mermaid"));
  const diagrams = templateConfig.diagrams ?? {};

  nodes.forEach((container) => {
    const mermaidId = container.getAttribute("data-mermaid-id") || "";
    if (mermaidId && diagrams[mermaidId]) {
      container.innerHTML = diagrams[mermaidId];
      return;
    }

    const label = toSafeLabel(mermaidId || "undefined_id");
    container.innerHTML = `
            graph TD
            A[${label}] --> B[Define templateConfig.diagrams entry]
        `;
  });

  return nodes;
}

function setupMermaidModal() {
  const modal = byId("mermaid-modal");
  const modalContent = byId("mermaid-modal-content");
  const modalTitle = byId("mermaid-modal-title");
  const modalDialog = modal?.querySelector(".mermaid-modal-dialog") ?? null;

  if (!modal || !modalContent || !modalTitle || !modalDialog) {
    return;
  }

  const targets = document.querySelectorAll(".graph-container, .card-visual");
  const ZOOM_STEP = 0.15;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 3;

  let zoom = 1;
  let activeSvg = null;
  let activeCanvas = null;
  let baseSvgWidth = 0;
  let baseSvgHeight = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartScrollLeft = 0;
  let panStartScrollTop = 0;
  let activeMermaidId = "unknown_diagram";

  let controls = modal.querySelector(".mermaid-modal-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "mermaid-modal-controls";
    controls.innerHTML = `
            <button class="mermaid-zoom-btn" type="button" data-mermaid-zoom="out" aria-label="Zoom out">-</button>
            <button class="mermaid-zoom-btn" type="button" data-mermaid-zoom="reset" aria-label="Reset zoom">RESET</button>
            <button class="mermaid-zoom-btn" type="button" data-mermaid-zoom="in" aria-label="Zoom in">+</button>
            <span class="mermaid-zoom-value" aria-live="polite">100%</span>
        `;
    modalDialog.appendChild(controls);
  }

  const zoomValue = controls.querySelector(".mermaid-zoom-value");

  const centerModalView = () => {
    const maxLeft = modalContent.scrollWidth - modalContent.clientWidth;
    if (maxLeft > 0) {
      modalContent.scrollLeft = Math.floor(maxLeft / 2);
      return;
    }
    modalContent.scrollLeft = 0;
  };

  const scheduleCenterModalView = () => {
    window.requestAnimationFrame(() => {
      centerModalView();
      window.requestAnimationFrame(centerModalView);
    });
  };

  const endPan = () => {
    if (!isPanning) {
      return;
    }
    isPanning = false;
    modalContent.classList.remove("is-panning");
  };

  const applyZoom = () => {
    if (!activeSvg || !activeCanvas) {
      return;
    }
    const nextWidth = Math.max(1, Math.round(baseSvgWidth * zoom));
    const nextHeight = Math.max(1, Math.round(baseSvgHeight * zoom));
    activeCanvas.style.width = `${nextWidth}px`;
    activeCanvas.style.height = `${nextHeight}px`;
    activeSvg.style.maxWidth = "none";
    activeSvg.style.width = "100%";
    activeSvg.style.height = "100%";
    activeSvg.setAttribute("width", String(baseSvgWidth));
    activeSvg.setAttribute("height", String(baseSvgHeight));

    if (zoom > 1.001) {
      modalContent.classList.add("can-pan");
    } else {
      endPan();
      modalContent.classList.remove("can-pan");
    }
    zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  };

  const setZoom = (nextZoom) => {
    const clampedZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
    if (Math.abs(clampedZoom - zoom) < 0.0001) {
      return;
    }
    zoom = clampedZoom;
    applyZoom();
  };

  const closeModal = () => {
    const wasOpen = modal.classList.contains("is-open");
    const closingTitle = modalTitle.textContent || "Mermaid Diagram";
    const modalDurationMs = analyticsSession.mermaidModalOpenedAt
      ? Math.max(0, Date.now() - analyticsSession.mermaidModalOpenedAt)
      : 0;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalContent.replaceChildren();
    endPan();
    modalContent.classList.remove("can-pan");
    activeSvg = null;
    activeCanvas = null;
    baseSvgWidth = 0;
    baseSvgHeight = 0;
    zoom = 1;
    zoomValue.textContent = "100%";
    syncModalBodyLock();
    analyticsSession.mermaidModalOpenedAt = 0;

    if (wasOpen) {
      trackSelectContent({
        contentType: "mermaid_diagram",
        itemId: activeMermaidId,
        itemName: closingTitle,
        sectionName: "mermaid_modal",
        interactionAction: "close_modal",
        elementType: "modal",
        elementLabel: closingTitle,
        modalName: "mermaid_modal",
        duration_ms: modalDurationMs,
        value: Math.round(modalDurationMs / 1000),
      });
    }
    activeMermaidId = "unknown_diagram";
  };

  const openModal = (target) => {
    const sourceSvg = target.querySelector(".mermaid svg");
    if (!sourceSvg) {
      return;
    }

    const clonedSvg = sourceSvg.cloneNode(true);
    clonedSvg.style.maxWidth = "none";
    clonedSvg.style.width = "100%";
    clonedSvg.style.height = "100%";

    const viewBox = sourceSvg.getAttribute("viewBox");
    let calculatedBaseWidth = 0;
    let calculatedBaseHeight = 0;
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        const modalBaseScale = 1.08;
        calculatedBaseWidth = Math.round(parts[2] * modalBaseScale);
        calculatedBaseHeight = Math.round(parts[3] * modalBaseScale);
      }
    }

    if (calculatedBaseWidth <= 0 || calculatedBaseHeight <= 0) {
      const rect = sourceSvg.getBoundingClientRect();
      const modalBaseScale = 1.08;
      calculatedBaseWidth = Math.max(
        1,
        Math.round(rect.width * modalBaseScale),
      );
      calculatedBaseHeight = Math.max(
        1,
        Math.round(rect.height * modalBaseScale),
      );
    }

    baseSvgWidth = calculatedBaseWidth;
    baseSvgHeight = calculatedBaseHeight;

    clonedSvg.setAttribute("width", String(baseSvgWidth));
    clonedSvg.setAttribute("height", String(baseSvgHeight));

    const canvas = document.createElement("div");
    canvas.className = "mermaid-modal-canvas";
    canvas.style.width = `${baseSvgWidth}px`;
    canvas.style.height = `${baseSvgHeight}px`;
    canvas.appendChild(clonedSvg);

    modalContent.replaceChildren(canvas);
    modalContent.scrollLeft = 0;
    modalContent.scrollTop = 0;
    activeCanvas = canvas;
    activeSvg = clonedSvg;
    zoom = 1;
    applyZoom();

    const titleText =
      target
        .closest(".service-card")
        ?.querySelector(".card-title")
        ?.textContent?.trim() ||
      target
        .closest(".hero-panel")
        ?.querySelector(".panel-title")
        ?.textContent?.trim() ||
      "Mermaid Diagram";
    const sourceType = target.closest(".service-card")
      ? "service_card"
      : "hero_panel";
    const diagramId =
      target.querySelector(".mermaid")?.getAttribute("data-mermaid-id") ||
      toSafeLabel(titleText);
    activeMermaidId = diagramId;
    analyticsSession.mermaidModalOpenedAt = Date.now();
    modalTitle.textContent = titleText;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    syncModalBodyLock();
    scheduleCenterModalView();

    trackSelectContent({
      contentType: "mermaid_diagram",
      itemId: diagramId,
      itemName: titleText,
      sectionName: "diagram",
      interactionAction: "open_modal",
      elementType: "diagram",
      elementLabel: titleText,
      modalName: "mermaid_modal",
      open_source: sourceType,
    });
  };

  controls.querySelectorAll("[data-mermaid-zoom]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const control = event.currentTarget;
      if (!(control instanceof HTMLElement)) {
        return;
      }
      const action = control.getAttribute("data-mermaid-zoom");
      if (!action || !modal.classList.contains("is-open")) {
        return;
      }

      if (action === "in") {
        setZoom(zoom + ZOOM_STEP);
        trackSelectContent({
          contentType: "mermaid_zoom",
          itemId: modalTitle.textContent || "Mermaid Diagram",
          itemName: modalTitle.textContent || "Mermaid Diagram",
          sectionName: "mermaid_modal",
          interactionAction: "zoom_in",
          elementType: "button",
          elementLabel: "ZOOM_IN",
          modalName: "mermaid_modal",
        });
        return;
      }
      if (action === "out") {
        setZoom(zoom - ZOOM_STEP);
        trackSelectContent({
          contentType: "mermaid_zoom",
          itemId: modalTitle.textContent || "Mermaid Diagram",
          itemName: modalTitle.textContent || "Mermaid Diagram",
          sectionName: "mermaid_modal",
          interactionAction: "zoom_out",
          elementType: "button",
          elementLabel: "ZOOM_OUT",
          modalName: "mermaid_modal",
        });
        return;
      }
      zoom = 1;
      applyZoom();
      scheduleCenterModalView();
      trackSelectContent({
        contentType: "mermaid_zoom",
        itemId: modalTitle.textContent || "Mermaid Diagram",
        itemName: modalTitle.textContent || "Mermaid Diagram",
        sectionName: "mermaid_modal",
        interactionAction: "zoom_reset",
        elementType: "button",
        elementLabel: "ZOOM_RESET",
        modalName: "mermaid_modal",
      });
    });
  });

  modalContent.addEventListener(
    "wheel",
    (event) => {
      if (
        !modal.classList.contains("is-open") ||
        !activeSvg ||
        !event.ctrlKey
      ) {
        return;
      }
      event.preventDefault();
      if (event.deltaY < 0) {
        setZoom(zoom + ZOOM_STEP);
        return;
      }
      setZoom(zoom - ZOOM_STEP);
    },
    { passive: false },
  );

  modalContent.addEventListener("pointerdown", (event) => {
    if (!modal.classList.contains("is-open") || !activeSvg || zoom <= 1.001) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartScrollLeft = modalContent.scrollLeft;
    panStartScrollTop = modalContent.scrollTop;
    modalContent.classList.add("is-panning");
    event.preventDefault();
  });

  modalContent.addEventListener("pointermove", (event) => {
    if (!isPanning) {
      return;
    }
    const deltaX = event.clientX - panStartX;
    const deltaY = event.clientY - panStartY;
    modalContent.scrollLeft = panStartScrollLeft - deltaX;
    modalContent.scrollTop = panStartScrollTop - deltaY;
    event.preventDefault();
  });

  modalContent.addEventListener("pointerup", endPan);
  modalContent.addEventListener("pointercancel", endPan);
  modalContent.addEventListener("pointerleave", (event) => {
    if (isPanning && !(event.buttons & 1)) {
      endPan();
    }
  });

  targets.forEach((target) => {
    target.classList.add("mermaid-zoom-target");
    target.setAttribute("tabindex", "0");
    target.setAttribute("role", "button");
    target.setAttribute("aria-label", "Open expanded Mermaid diagram");

    target.addEventListener("click", () => openModal(target));
    target.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal(target);
      }
    });
  });

  modal.querySelectorAll("[data-mermaid-close]").forEach((closeButton) => {
    closeButton.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) {
      return;
    }
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + ZOOM_STEP);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom(zoom - ZOOM_STEP);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      zoom = 1;
      applyZoom();
      scheduleCenterModalView();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setSystemInfo();
  renderHero();
  renderTopPanels();
  renderSkills();
  renderServiceSections();
  renderContact();
  renderNavigation();
  setupUptime();
  setupMobileNav();

  const mermaidNodes = injectMermaidSources();
  for (let index = 0; index < mermaidNodes.length; index += 1) {
    const node = mermaidNodes[index];
    const isHidden = !!node.closest(".is-collapsed-hidden") || node.hidden;
    if (!isHidden) {
      // eslint-disable-next-line no-await-in-loop
      await renderMermaidContainer(node, { force: true });
    }
  }

  setupMermaidModal();
  setupScrollSpy();
});
