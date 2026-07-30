/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselBannerParser from './parsers/carousel-banner.js';
import cardsVideoParser from './parsers/cards-video.js';
import columnsMediaParser from './parsers/columns-media.js';
import columnsPromoParser from './parsers/columns-promo.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/enovis-cleanup.js';
import sectionsTransformer from './transformers/enovis-sections.js';
import dmImagesTransformer from './transformers/enovis-dm-images.js';

// PARSER REGISTRY
const parsers = {
  'carousel-banner': carouselBannerParser,
  'cards-video': cardsVideoParser,
  'columns-media': columnsMediaParser,
  'columns-promo': columnsPromoParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Enovis corporate homepage: hero carousel, featured video cards, corporate content sections (CSR, patient care, careers), press & events, and closing promo banner.',
  urls: [
    'https://enovis.com/',
  ],
  blocks: [
    {
      name: 'carousel-banner',
      instances: ['#slides-homepage', '.top-slider .slides'],
    },
    {
      name: 'cards-video',
      instances: ['.featured-videos-homepage'],
    },
    {
      name: 'columns-media',
      instances: [
        '#node-1 .field__item > section.padding-top-2:nth-of-type(2)',
        '#node-1 .field__item > section.padding-top-2:nth-of-type(3)',
        '#node-1 .field__item > section.padding-top-2:nth-of-type(4)',
        '.press-events',
      ],
    },
    {
      name: 'columns-promo',
      instances: ['section.background-color-primary-dark-primary'],
    },
  ],
  sections: [
    {
      id: 'rc4',
      name: 'Hero carousel',
      selector: ['#page > div.top-slider', '.top-slider'],
      style: null,
      blocks: ['carousel-banner'],
      defaultContent: [],
    },
    {
      id: 'rc5',
      name: 'Featured videos grid',
      selector: ['#content-top'],
      style: 'dark',
      blocks: ['cards-video'],
      defaultContent: [],
    },
    {
      id: 'intro',
      name: 'Company intro statement',
      selector: ['#node-1 .field__item > section.padding-top-2:nth-of-type(1)'],
      style: null,
      blocks: [],
      defaultContent: ['#node-1 .field__item > section.padding-top-2:nth-of-type(1) p'],
    },
    {
      id: 'rc8',
      name: 'One Company. One Team. One Shared Purpose. (CSR)',
      selector: ['#node-1 .field__item > section.padding-top-2:nth-of-type(2)'],
      style: null,
      blocks: ['columns-media'],
      defaultContent: [],
    },
    {
      id: 'rc9',
      name: 'Transforming patient care',
      selector: ['#node-1 .field__item > section.padding-top-2:nth-of-type(3)'],
      style: null,
      blocks: ['columns-media'],
      defaultContent: [],
    },
    {
      id: 'rc10',
      name: 'Working at Enovis',
      selector: ['#node-1 .field__item > section.padding-top-2:nth-of-type(4)'],
      style: null,
      blocks: ['columns-media'],
      defaultContent: [],
    },
    {
      id: 'rc11',
      name: 'Press & Events + Creating Better Together banner',
      selector: ['#content-bottom'],
      style: null,
      blocks: ['columns-media', 'columns-promo'],
      defaultContent: [
        '.press-events h2.block-title',
        '.press-events footer.view-footer a.button',
      ],
    },
  ],
};

// TRANSFORMER REGISTRY
// cleanup runs both hooks (chrome removal); sections adds <hr>/metadata in
// afterTransform; dm-images converts DM <img> to carrier anchors in afterTransform.
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
  dmImagesTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        // Avoid double-processing an element matched by multiple selectors
        if (seen.has(element)) return;
        seen.add(element);
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
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

    // 4. afterTransform (final cleanup + section breaks/metadata + DM image carriers)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5b. Detach a deep clone for serialization. The Osano cookie-consent
    // dialog is a reactive lit-html web component that re-renders into the live
    // document.body *after* this transform returns but *before* the harness
    // reads element.outerHTML — so in-place removal in the cleanup transformer
    // doesn't stick (the consent markup reappears on the live node). A detached
    // clone is not part of the live document, so those async re-renders can't
    // touch it; serializing the clone freezes the cleaned DOM. As a belt-and-
    // braces guard, re-run the same consent-signature sweep on the clone.
    const serializable = main.cloneNode(true);
    const OSANO_SIGNATURE = /Deny Non-Essential|Storage Preferences/;
    const osanoMatches = Array.from(serializable.querySelectorAll('*')).filter(
      (el) => OSANO_SIGNATURE.test(el.textContent || ''),
    );
    osanoMatches
      .filter((el) => !osanoMatches.some((other) => other !== el && el.contains(other)))
      .forEach((el) => el.remove());

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/index',
    );

    return [{
      element: serializable,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
