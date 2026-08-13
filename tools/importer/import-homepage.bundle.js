/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/carousel-banner.js
  function parse(element, { document }) {
    const fieldCell = (name, ...nodes) => [document.createComment(` field:${name} `), ...nodes.filter(Boolean)];
    const normalizeImg = (img) => {
      if (!img) return null;
      if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:")) {
        const real = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || (img.getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0] || (img.getAttribute("data-srcset") || "").split(",")[0].trim().split(" ")[0];
        if (real) img.setAttribute("src", real);
      }
      return img;
    };
    const bgUrl = (styleValue) => {
      if (!styleValue) return null;
      const m = styleValue.match(/url\((['"]?)(.*?)\1\)/i);
      return m ? m[2] : null;
    };
    const imageFromBackground = (slide) => {
      let url = bgUrl(slide.getAttribute("style"));
      if (!url) {
        const bgEl = slide.querySelector('[style*="background"]');
        url = bgEl ? bgUrl(bgEl.getAttribute("style")) : null;
      }
      if (!url) return null;
      const img = document.createElement("img");
      img.setAttribute("src", url);
      return img;
    };
    let slides = Array.from(element.querySelectorAll(":scope > .slide"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".slide"));
    const cells = [];
    slides.forEach((slide) => {
      if (slide.getAttribute("aria-hidden") === "true" || /slick-cloned/.test(slide.className)) return;
      const image = normalizeImg(slide.querySelector(":scope > img") || slide.querySelector("img")) || imageFromBackground(slide);
      const textRoot = slide.querySelector(".slide-text") || slide;
      const eyebrow = textRoot.querySelector('span.h4, span[class*="h4"], .h4');
      const heading = textRoot.querySelector("h1, h2, h3");
      const paragraph = textRoot.querySelector("p");
      const cta = textRoot.querySelector('a.button, a[class*="button"], a');
      if (!image && !heading && !eyebrow) return;
      const contentNodes = [eyebrow, heading, paragraph, cta].filter(Boolean);
      cells.push([
        fieldCell("media_image", image),
        fieldCell("content_text", ...contentNodes)
      ]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-video.js
  function parse2(element, { document }) {
    const fieldCell = (name, ...nodes2) => [document.createComment(` field:${name} `), ...nodes2.filter(Boolean)];
    const normalizeImg = (img) => {
      if (!img) return null;
      if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:")) {
        const real = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || (img.getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0] || (img.getAttribute("data-srcset") || "").split(",")[0].trim().split(" ")[0];
        if (real) img.setAttribute("src", real);
      }
      return img;
    };
    let nodes = Array.from(element.querySelectorAll(".node--type-education-video"));
    if (!nodes.length) nodes = Array.from(element.querySelectorAll(".video-thumbnail"));
    if (!nodes.length) nodes = Array.from(element.querySelectorAll(".col-sm-4"));
    const cells = [];
    nodes.forEach((node) => {
      let poster = node.querySelector(".vid-thumb img");
      if (!poster) {
        poster = Array.from(node.querySelectorAll("img")).find((img) => !img.closest(".video-title")) || node.querySelector("img");
      }
      poster = normalizeImg(poster);
      const title = node.querySelector(".video-title h1, .video-title h2, .video-title h3, .video-title h4, h1, h2, h3, h4");
      if (!poster && !title) return;
      cells.push([
        fieldCell("image", poster),
        fieldCell("text", title)
      ]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-video", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media.js
  function parse3(element, { document }) {
    const normalizeImg = (img) => {
      if (!img) return img;
      if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:")) {
        const real = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || (img.getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0] || (img.getAttribute("data-srcset") || "").split(",")[0].trim().split(" ")[0];
        if (real) img.setAttribute("src", real);
      }
      return img;
    };
    const fixImgs = (nodes) => {
      nodes.forEach((n) => {
        if (n && n.tagName === "IMG") normalizeImg(n);
        else if (n && n.querySelectorAll) n.querySelectorAll("img").forEach(normalizeImg);
      });
      return nodes;
    };
    const isPress = element.classList.contains("press-events") || element.querySelector(".press-homepage, .events-homepage, .press-events");
    const cells = [];
    if (isPress) {
      const pressItems = Array.from(element.querySelectorAll(".press-homepage .margin-bottom-2, .view-content > .margin-bottom-2")).filter((el) => !el.closest(".attachment-after, .attachment"));
      const sourceItems = pressItems.length ? pressItems : Array.from(element.querySelectorAll(".press-homepage > .view-content > *"));
      const leftContent = [];
      sourceItems.forEach((item) => {
        const titleLink = item.querySelector("h1 a, h2 a, h3 a, h4 a, a");
        if (titleLink && (titleLink.textContent || "").trim()) {
          const h = document.createElement("h3");
          h.textContent = (titleLink.textContent || "").trim();
          leftContent.push(h);
        }
        const time = item.querySelector("time");
        if (time && time.textContent.trim()) {
          const p = document.createElement("p");
          p.textContent = time.textContent.replace(/\s+/g, " ").trim();
          leftContent.push(p);
        }
        const body = item.querySelector(".views-field-body .field-content, .field-content");
        if (body && body.textContent.trim()) {
          const p = document.createElement("p");
          p.textContent = body.textContent.replace(/\s+/g, " ").trim();
          leftContent.push(p);
        }
      });
      const rightContent = [];
      const eventsTable = element.querySelector(".events-homepage table, .attachment-after table, .attachment table, table");
      if (eventsTable) {
        Array.from(eventsTable.querySelectorAll("tr")).forEach((tr) => {
          const tds = Array.from(tr.querySelectorAll("td"));
          if (!tds.length) return;
          const dateText = (tds[0] ? tds[0].textContent : "").replace(/\s+/g, " ").trim();
          const nameText = (tds[1] ? tds[1].textContent : "").replace(/\s+/g, " ").trim();
          if (!dateText && !nameText) return;
          const p = document.createElement("p");
          if (dateText) {
            const strong = document.createElement("strong");
            strong.textContent = dateText;
            p.append(strong);
          }
          if (dateText && nameText) p.append(document.createElement("br"));
          if (nameText) p.append(document.createTextNode(nameText));
          rightContent.push(p);
        });
      }
      if (!leftContent.length && !rightContent.length) {
        element.replaceWith(...element.childNodes);
        return;
      }
      const title = element.querySelector("h2.block-title, .block-title");
      const footerCta = element.querySelector("footer.view-footer a.button, .view-footer a.button, .view-footer a");
      cells.push([leftContent, rightContent]);
      const block2 = WebImporter.Blocks.createBlock(document, { name: "columns-media", cells });
      if (title) element.before(title);
      element.replaceWith(block2);
      if (footerCta) block2.after(footerCta);
      return;
    }
    const row = element.querySelector(".row") || element;
    let columns = Array.from(row.querySelectorAll(':scope > [class*="col-"]')).filter((col) => col.querySelector("img, h1, h2, h3, h4, p, a") || col.textContent.trim());
    if (!columns.length) columns = Array.from(row.children);
    const offset = (col) => {
      const cls = col.className || "";
      const push = (cls.match(/col-\w+-push-(\d+)/) || [])[1];
      const pull = (cls.match(/col-\w+-pull-(\d+)/) || [])[1];
      return (push ? Number(push) : 0) - (pull ? Number(pull) : 0);
    };
    const ordered = columns.map((col, i) => ({ col, i, key: i + offset(col) })).sort((a, b) => a.key - b.key).map((x) => x.col);
    const columnCells = ordered.map((col) => {
      const content = Array.from(col.children).filter((c) => {
        var _a;
        return c.textContent.trim() || c.tagName === "IMG" || ((_a = c.querySelector) == null ? void 0 : _a.call(c, "img"));
      });
      return fixImgs(content.length ? content : [col]);
    });
    if (!columnCells.length || columnCells.every((c) => !c.length)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    cells.push(columnCells);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-promo.js
  function parse4(element, { document }) {
    const row = element.querySelector(".row") || element;
    let columns = Array.from(row.querySelectorAll(':scope > [class*="col-"]')).filter((col) => col.textContent.trim() || col.querySelector("img"));
    if (!columns.length) columns = Array.from(row.children).filter((c) => c.textContent.trim());
    const columnCells = columns.map((col) => {
      const content = Array.from(col.children).filter((c) => {
        var _a;
        return c.textContent.trim() || c.tagName === "IMG" || ((_a = c.querySelector) == null ? void 0 : _a.call(c, "img"));
      });
      return content.length ? content : [col];
    });
    if (!columnCells.length || columnCells.every((c) => !c.length)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [columnCells];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/enovis-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".osano-cm-window",
        ".osano-visually-hidden"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".global-search-bar"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        // Osano cookie consent (lit-html web component). Also removed in
        // beforeTransform, but the dialog is populated after that snapshot on
        // some renders, so re-remove here where removal is reliable. Broad
        // attribute selectors catch every osano-* container variant.
        ".osano-cm-window",
        ".osano-visually-hidden",
        '[class*="osano-cm"]',
        '[id*="osano"]',
        "header",
        "#footer",
        "#messages",
        'a[href="#main-content"]',
        "#main-content",
        "iframe",
        "link",
        "noscript",
        // Mmenu off-canvas mobile navigation. The Mmenu JS relocates the
        // #mobile-menu <nav> (and its blocker overlay) to body level at runtime,
        // so it escapes the `header` removal above and would otherwise dump the
        // entire mega-menu (#mm-* panels) at the top of the imported document.
        "#mobile-menu",
        ".mm-menu",
        ".mm-wrapper__blocker",
        // jQuery UI autocomplete menu injected at body level by the search widget.
        "#ui-id-1",
        // AddToAny share bar + HubSpot web-interactive anchors (marketing chrome,
        // not authorable page content).
        "#addtoany",
        '[id^="hs-web-interactives-"]',
        // Residual "Close menu" anchor that targets the Mmenu slideout wrapper.
        'a[href="#mm-0"]'
      ]);
      const OSANO_SIGNATURE = /Deny Non-Essential|Storage Preferences/;
      const osanoMatches = Array.from(element.querySelectorAll("*")).filter(
        (el) => OSANO_SIGNATURE.test(el.textContent || "")
      );
      osanoMatches.filter((el) => !osanoMatches.some((other) => other !== el && el.contains(other))).forEach((el) => el.remove());
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("data-drupal-messages");
        el.removeAttribute("data-drupal-selector");
        el.removeAttribute("data-once");
      });
    }
  }

  // tools/importer/transformers/enovis-sections.js
  var TransformHook2 = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function findSectionElement(element, selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      try {
        const el = element.querySelector(sel);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.afterTransform) return;
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument;
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const target = findSectionElement(element, section.selector);
      if (!target) {
        console.warn("Section element not found for section:", section.id, section.selector);
        continue;
      }
      if (section.style) {
        const metaBlock = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        if (target.parentNode) {
          target.parentNode.insertBefore(metaBlock, target.nextSibling);
        }
      }
      if (i > 0) {
        const hr = doc.createElement("hr");
        if (target.parentNode) {
          target.parentNode.insertBefore(hr, target);
        }
      }
    }
  }

  // tools/importer/transformers/enovis-dm-images.js
  function detectDynamicMediaUrl(urlStr) {
    let u;
    try {
      u = new URL(urlStr, "https://x/");
    } catch (e) {
      return false;
    }
    if (u.pathname.startsWith("/is/image/")) {
      return "scene7";
    }
    if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname) && u.pathname.startsWith("/adobe/assets/urn:")) {
      return "dm-openapi";
    }
    if (/(^|\.)widen\.net$/.test(u.hostname) && u.pathname.startsWith("/content/")) {
      return "widen";
    }
    return false;
  }
  var LINKED_DM_INLINE_WRAPPER_TAGS = /* @__PURE__ */ new Set(["PICTURE"]);
  var LINKED_DM_WRAPPER_SIBLING_TAGS = /* @__PURE__ */ new Set(["SOURCE"]);
  function findLinkedDmCarrier(img) {
    if (!img || !img.parentElement) return null;
    let node = img;
    let parent = img.parentElement;
    while (parent && LINKED_DM_INLINE_WRAPPER_TAGS.has(parent.tagName)) {
      let foundNode = false;
      for (const child of parent.children) {
        if (child === node) {
          foundNode = true;
        } else if (!LINKED_DM_WRAPPER_SIBLING_TAGS.has(child.tagName)) {
          return null;
        }
      }
      if (!foundNode) return null;
      node = parent;
      parent = parent.parentElement;
    }
    if (!parent || parent.tagName !== "A") return null;
    if (parent.children.length !== 1 || parent.children[0] !== node) return null;
    if (parent.textContent.trim() !== "") return null;
    return parent;
  }
  var EMPTY_ALT_SENTINEL = "Image without alt text";
  function altToLinkText(alt) {
    return alt || EMPTY_ALT_SENTINEL;
  }
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const doc = element.ownerDocument;
    element.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!detectDynamicMediaUrl(src)) return;
      const alt = img.getAttribute("alt") || "";
      const linkedAnchor = findLinkedDmCarrier(img);
      if (linkedAnchor) {
        linkedAnchor.setAttribute("title", src);
        linkedAnchor.textContent = altToLinkText(alt);
        return;
      }
      const parent = img.parentElement;
      if (parent && parent.tagName === "A") {
        console.warn("DM image inside mixed-content anchor, skipped:", src);
        return;
      }
      const a = doc.createElement("a");
      a.href = src;
      a.textContent = altToLinkText(alt);
      img.replaceWith(a);
    });
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "carousel-banner": parse,
    "cards-video": parse2,
    "columns-media": parse3,
    "columns-promo": parse4
  };
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Enovis corporate homepage: hero carousel, featured video cards, corporate content sections (CSR, patient care, careers), press & events, and closing promo banner.",
    urls: [
      "https://enovis.com/"
    ],
    blocks: [
      {
        name: "carousel-banner",
        instances: ["#slides-homepage", ".top-slider .slides"]
      },
      {
        name: "cards-video",
        instances: [".featured-videos-homepage"]
      },
      {
        name: "columns-media",
        instances: [
          "#node-1 .field__item > section.padding-top-2:nth-of-type(2)",
          "#node-1 .field__item > section.padding-top-2:nth-of-type(3)",
          "#node-1 .field__item > section.padding-top-2:nth-of-type(4)",
          ".press-events"
        ]
      },
      {
        name: "columns-promo",
        instances: ["section.background-color-primary-dark-primary"]
      }
    ],
    sections: [
      {
        id: "rc4",
        name: "Hero carousel",
        selector: ["#page > div.top-slider", ".top-slider"],
        style: null,
        blocks: ["carousel-banner"],
        defaultContent: []
      },
      {
        id: "rc5",
        name: "Featured videos grid",
        selector: ["#content-top"],
        style: "dark",
        blocks: ["cards-video"],
        defaultContent: []
      },
      {
        id: "intro",
        name: "Company intro statement",
        selector: ["#node-1 .field__item > section.padding-top-2:nth-of-type(1)"],
        style: null,
        blocks: [],
        defaultContent: ["#node-1 .field__item > section.padding-top-2:nth-of-type(1) p"]
      },
      {
        id: "rc8",
        name: "One Company. One Team. One Shared Purpose. (CSR)",
        selector: ["#node-1 .field__item > section.padding-top-2:nth-of-type(2)"],
        style: null,
        blocks: ["columns-media"],
        defaultContent: []
      },
      {
        id: "rc9",
        name: "Transforming patient care",
        selector: ["#node-1 .field__item > section.padding-top-2:nth-of-type(3)"],
        style: null,
        blocks: ["columns-media"],
        defaultContent: []
      },
      {
        id: "rc10",
        name: "Working at Enovis",
        selector: ["#node-1 .field__item > section.padding-top-2:nth-of-type(4)"],
        style: null,
        blocks: ["columns-media"],
        defaultContent: []
      },
      {
        id: "rc11",
        name: "Press & Events + Creating Better Together banner",
        selector: ["#content-bottom"],
        style: null,
        blocks: ["columns-media", "columns-promo"],
        defaultContent: [
          ".press-events h2.block-title",
          ".press-events footer.view-footer a.button"
        ]
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : [],
    transform3
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    const seen = /* @__PURE__ */ new Set();
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const {
        document,
        url,
        html,
        params
      } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const serializable = main.cloneNode(true);
      const OSANO_SIGNATURE = /Deny Non-Essential|Storage Preferences/;
      const osanoMatches = Array.from(serializable.querySelectorAll("*")).filter(
        (el) => OSANO_SIGNATURE.test(el.textContent || "")
      );
      osanoMatches.filter((el) => !osanoMatches.some((other) => other !== el && el.contains(other))).forEach((el) => el.remove());
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "") || "/index"
      );
      return [{
        element: serializable,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
