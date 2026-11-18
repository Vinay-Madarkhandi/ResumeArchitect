// This function is serialized by scripting.executeScript. Keep its helpers inside it.
export function extractJob(doc = document, href = location.href) {
  const pageUrl = new URL(href);
  pageUrl.hash = "";
  const hostname = pageUrl.hostname;
  const onHost = (domain) => hostname === domain || hostname.endsWith("." + domain);
  const inline = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const list = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

  function readable(node) {
    if (!node) return "";
    const copy = node.cloneNode(true);
    copy.querySelectorAll("script, style, noscript, template, nav, footer, form, button, iframe, [hidden], [aria-hidden='true']").forEach((n) => n.remove());
    copy.querySelectorAll("br, p, li, h1, h2, h3, h4, h5, h6, div, section, article, tr").forEach((n) => {
      n.before(doc.createTextNode("\n"));
      n.after(doc.createTextNode("\n"));
    });
    return (copy.textContent ?? "").replaceAll("\u00a0", " ").split(/\r?\n/)
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim()).filter(Boolean).join("\n");
  }

  function description(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    if (!/<[!a-z][^>]*>|&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value)) return value.trim();
    const template = doc.createElement("template");
    template.innerHTML = value;
    const container = doc.createElement("div");
    container.append(template.content);
    return readable(container);
  }

  function postings(input) {
    if (Array.isArray(input)) return input.flatMap(postings);
    if (!input || typeof input !== "object") return [];
    const kinds = list(input["@type"]);
    if (kinds.some((kind) => typeof kind === "string" && /(?:^|[\/#])JobPosting$/.test(kind))) return [input];
    return [...postings(input["@graph"]), ...postings(input.mainEntity)];
  }

  const candidates = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => {
    try {
      return postings(JSON.parse(node.textContent ?? ""));
    } catch {
      return [];
    }
  });
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const samePosting = (posting) => {
    const url = posting.url ?? posting.mainEntityOfPage?.["@id"];
    if (typeof url !== "string") return false;
    try {
      const candidate = new URL(url, href);
      return candidate.host === pageUrl.host && candidate.pathname === pageUrl.pathname && candidate.search === pageUrl.search
        || candidate.href === canonical;
    } catch {
      return false;
    }
  };
  const posting = candidates.find(samePosting) ?? candidates[0];

  function locationName(place) {
    if (typeof place === "string") return inline(place);
    const address = place?.address ?? place;
    if (typeof address === "string") return inline(address);
    return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
      .map((part) => inline(typeof part === "object" && part !== null ? part.name : part))
      .filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(", ") || inline(place?.name);
  }

  function salaryText(wage) {
    if (typeof wage === "string") return inline(wage);
    if (typeof wage === "number") return String(wage);
    const quantity = wage?.value ?? wage;
    const amount = (value) => typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
    const min = amount(quantity?.minValue);
    const max = amount(quantity?.maxValue);
    const range = amount(quantity?.value ?? quantity) || (min && max && min !== max ? `${min}–${max}` : min || max);
    if (!range) return "";
    const unit = inline(quantity?.unitText ?? wage?.unitText).toLowerCase();
    return [inline(wage?.currency), range].filter(Boolean).join(" ") + (unit ? ` / ${unit}` : "");
  }

  let selected = {};
  if (onHost("linkedin.com")) selected = {
    title: [".job-details-jobs-unified-top-card__job-title", ".top-card-layout__title", ".topcard__title"],
    company: [".job-details-jobs-unified-top-card__company-name", ".topcard__org-name-link", ".topcard__flavor a"],
    location: [".job-details-jobs-unified-top-card__primary-description-container .tvm__text.tvm__text--low-emphasis",
      ".topcard__flavor--bullet", ".job-details-jobs-unified-top-card__primary-description-container .tvm__text"],
    salary: [".job-details-jobs-unified-top-card__job-insight--highlight", ".salary-main-rail__data-body"],
    description: ["#job-details", ".show-more-less-html__markup", ".description__text"],
  };
  else if (/(^|\.)indeed\.[a-z.]+$/.test(hostname)) selected = {
    title: ['[data-testid="jobsearch-JobInfoHeader-title"]', ".jobsearch-JobInfoHeader-title"],
    company: ['[data-testid="inlineHeader-companyName"]', "[data-company-name='true']"],
    location: ['[data-testid="job-location"]', '[data-testid="inlineHeader-companyLocation"]', '[data-testid="jobsearch-JobInfoHeader-companyLocation"]'],
    salary: ["#salaryInfoAndJobType", '[data-testid="jobsearch-JobInfoHeader-salary"]'],
    description: ["#jobDescriptionText"],
  };
  else if (onHost("greenhouse.io")) selected = {
    title: [".app-title", ".job__title", ".job-title"],
    company: [".company-name", ".job__company", ".job-company-name"],
    location: [".job__location", ".location"],
    salary: [".pay-range", ".job__salary", "[data-testid='pay-range']"],
    description: ["#content", ".job__description"],
  };
  else if (onHost("lever.co")) selected = {
    title: [".posting-headline h2"],
    company: [".main-header-logo img", ".posting-company"],
    location: [".posting-categories .location"],
    salary: [".salary-range", ".posting-categories .salary", ".posting-salary"],
    description: [".section-wrapper.page-full-width", ".posting-page .section-wrapper", ".posting-page .posting-description"],
  };
  else if (onHost("myworkdayjobs.com") || onHost("myworkdaysite.com")) selected = {
    title: ['[data-automation-id="jobPostingHeader"]'],
    company: ['[data-automation-id="companyName"]', '[data-automation-id="logo"] img'],
    location: ['[data-automation-id="locations"] dd', '[data-automation-id="locations"]', '[data-automation-id="location"]'],
    salary: ['[data-automation-id="jobPostingSalary"]', '[data-automation-id="salaryRange"]'],
    description: ['[data-automation-id="jobPostingDescription"]'],
  };

  function pick(selectors, long = false) {
    for (const selector of selectors ?? []) {
      const element = doc.querySelector(selector);
      const value = long ? readable(element) : inline(element?.getAttribute("alt") || element?.textContent);
      if (value) return value;
    }
    return "";
  }

  function meta(name) {
    return inline(doc.querySelector(`meta[property="${name}"]`)?.getAttribute("content"));
  }

  const region = pick(selected.location).split(/\s+[·•]\s+/)[0];
  const locations = list(posting?.jobLocation).map(locationName).filter(Boolean);
  const remote = inline(posting?.jobLocationType).toUpperCase() === "TELECOMMUTE";
  const remoteRegions = list(posting?.applicantLocationRequirements).map(locationName).filter(Boolean);
  const structuredLocation = remote
    ? ["Remote", (remoteRegions.length ? remoteRegions : locations).join(" / ")].filter(Boolean).join(" · ")
    : locations.join(" / ");
  const company = inline(posting?.hiringOrganization?.name ?? posting?.hiringOrganization)
    || pick(selected.company).replace(/^at\s+/i, "") || meta("og:site_name");
  return {
    title: (inline(posting?.title ?? posting?.name) || pick(selected.title) || pick(["main h1", "h1"]) || meta("og:title") || inline(doc.title)).slice(0, 250),
    company: company.slice(0, 250),
    location: (structuredLocation || region).slice(0, 250),
    salary: (salaryText(posting?.baseSalary ?? posting?.estimatedSalary) || pick(selected.salary)).slice(0, 250),
    description: (description(posting?.description) || pick(selected.description, true)
      || pick(['[itemprop="description"]', "main article", "article", "main", "body"], true)).slice(0, 50_000),
    url: pageUrl.href.length <= 2048 ? pageUrl.href : "",
  };
}
