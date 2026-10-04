const header = document.querySelector("[data-header]");
const hero = document.querySelector("[data-hero]");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const cursorGlow = document.querySelector(".cursor-glow");
const scanForm = document.querySelector("#scan-form");
const targetInput = document.querySelector("#target-url");
const scanButton = document.querySelector(".scan-button");
const inputWrap = document.querySelector(".url-input-wrap");
const resultHost = document.querySelector("[data-result-host]");
const resultStatus = document.querySelector("[data-result-status]");
const resultRisk = document.querySelector("[data-result-risk]");
const resultTls = document.querySelector("[data-result-tls]");
const resultHeaders = document.querySelector("[data-result-headers]");
const resultTechnologies = document.querySelector("[data-result-technologies]");
const resultVulnerabilities = document.querySelector("[data-result-vulnerabilities]");
const resultMeta = document.querySelector("[data-result-meta]");
const errorMessage = document.querySelector("[data-error-message]");
const states = [...document.querySelectorAll("[data-state]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelector("[data-year]").textContent = new Date().getFullYear();

const setScanState = (state) => {
  states.forEach((item) => {
    item.hidden = item.dataset.state !== state;
  });
};

const parseHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

targetInput.addEventListener("input", () => {
  inputWrap.classList.toggle("valid", Boolean(parseHttpsUrl(targetInput.value.trim())));
});

scanForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = parseHttpsUrl(targetInput.value.trim());

  if (!target) {
    errorMessage.textContent = "Enter a complete HTTPS URL, such as https://example.com.";
    setScanState("error");
    targetInput.focus();
    return;
  }

  scanButton.classList.add("is-loading");
  scanButton.disabled = true;
  setScanState("loading");

  try {
    const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname)
      && window.location.port !== "5000";
    const apiBaseUrl = isLocalFrontend ? "http://127.0.0.1:5000" : "";
    const response = await fetch(`${apiBaseUrl}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: target.href }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Scan failed with status ${response.status}.`);
    }

    const findings = Array.isArray(data.findings) ? data.findings : [];
    const technologies = Array.isArray(data.technologies) ? data.technologies : [];
    const headerFindings = findings.filter((finding) => finding.category === "security_header");
    const vulnerabilityFindings = findings.filter((finding) => finding.category === "vulnerability");
    const severityOrder = ["critical", "high", "medium", "low"];
    const highestSeverity = severityOrder.find((severity) =>
      findings.some((finding) => finding.severity === severity),
    );

    resultHost.textContent = target.hostname;
    resultStatus.textContent = data.moduleErrors?.length ? "Scan complete · partial" : "Scan complete";
    resultRisk.textContent = highestSeverity ? `${highestSeverity} risk` : "No findings";
    resultTls.textContent = data.tls?.valid
      ? `${data.tls.protocol || "TLS"} · Valid`
      : `${data.tls?.protocol || "TLS"} · Review`;
    resultHeaders.textContent = headerFindings.length
      ? `${headerFindings.length} issue${headerFindings.length === 1 ? "" : "s"}`
      : "No issues found";
    resultTechnologies.textContent = technologies.length
      ? technologies.slice(0, 2).map((technology) => technology.version
        ? `${technology.name} ${technology.version}`
        : technology.name).join(", ")
      : "None exposed";
    resultVulnerabilities.textContent = vulnerabilityFindings.length
      ? `${vulnerabilityFindings.length} known`
      : "None correlated";
    resultMeta.textContent = data.scanId
      ? `Scan ${data.scanId} completed${data.timestamp ? ` · ${new Date(data.timestamp).toLocaleString()}` : ""}.`
      : "Scan completed.";
    setScanState("results");
  } catch (error) {
    errorMessage.textContent = error.message || "Unable to reach the PatchLens scanner API.";
    setScanState("error");
  } finally {
    scanButton.classList.remove("is-loading");
    scanButton.disabled = false;
  }
});

const setMenu = (open) => {
  menuToggle.setAttribute("aria-expanded", String(open));
  mobileNav.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
};

menuToggle.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

window.addEventListener(
  "scroll",
  () => header.classList.toggle("scrolled", window.scrollY > 30),
  { passive: true },
);

if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  });
}

if (!reducedMotion.matches && window.matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    hero.style.setProperty("--space-x", `${x * -5}px`);
    hero.style.setProperty("--space-y", `${y * -4}px`);
    hero.style.setProperty("--planet-x", `${x * -11}px`);
    hero.style.setProperty("--planet-y", `${y * -7}px`);
    hero.style.setProperty("--horizon-x", `${x * 1.5}px`);
    hero.style.setProperty("--horizon-y", `${y}px`);
  });

  hero.addEventListener("pointerleave", () => {
    ["--space-x", "--space-y", "--planet-x", "--planet-y", "--horizon-x", "--horizon-y"].forEach((property) => {
      hero.style.setProperty(property, "0px");
    });
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  revealObserver.observe(element);
});

window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY < window.innerHeight * 1.1) {
      hero.style.setProperty("--planet-scroll", `${window.scrollY * 0.04}px`);
    }
  },
  { passive: true },
);
