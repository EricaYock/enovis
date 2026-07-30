/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-banner (base block: carousel).
 * Source: https://enovis.com/ — Hero carousel (#slides-homepage / .top-slider .slides)
 * Generated: 2026-07-30
 *
 * Container block. Each `.slide` becomes one row (a "Carousel Banner Slide").
 * Model (carousel-banner-item):
 *   - media_image (reference)  -> cell 1 (field hint media_image), holds the slide <img>
 *   - media_imageAlt (collapsed, Alt suffix) -> folded into the <img> alt attribute (no hint)
 *   - content_text (richtext)  -> cell 2 (field hint content_text): eyebrow, heading, paragraph, CTA
 *
 * DM/Scene7 note: slide images are Widen Dynamic Media URLs. The <img> is placed in its
 * natural media_image slot; the DM-images transformer rewrites it to a carrier anchor later.
 */
export default function parse(element, { document }) {
  // helper: build a cell whose content is prefixed with a field hint comment
  const fieldCell = (name, ...nodes) => [document.createComment(` field:${name} `), ...nodes.filter(Boolean)];

  // helper: normalize lazy-loaded images so the carrier <img> has a resolvable src
  const normalizeImg = (img) => {
    if (!img) return null;
    if (!img.getAttribute('src') || img.getAttribute('src').startsWith('data:')) {
      const real = img.getAttribute('data-src')
        || img.getAttribute('data-lazy-src')
        || img.getAttribute('data-original')
        || (img.getAttribute('srcset') || '').split(',')[0].trim().split(' ')[0]
        || (img.getAttribute('data-srcset') || '').split(',')[0].trim().split(' ')[0];
      if (real) img.setAttribute('src', real);
    }
    return img;
  };

  // helper: pull the first url(...) out of a background / background-image value
  const bgUrl = (styleValue) => {
    if (!styleValue) return null;
    const m = styleValue.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : null;
  };

  // helper: synthesize an <img> from a slide's inline background-image. Flickity
  // (the live carousel JS) lazy-loads each slide's banner as an inline
  // `background: url(...)` on the .slide element instead of an <img>, so on the
  // rendered DOM the importer sees no <img> to place in the media_image cell.
  // Recover the URL from the inline style (or a nested [style*=background]
  // descendant) and build a real <img> the DM-images transformer can carry.
  const imageFromBackground = (slide) => {
    let url = bgUrl(slide.getAttribute('style'));
    if (!url) {
      const bgEl = slide.querySelector('[style*="background"]');
      url = bgEl ? bgUrl(bgEl.getAttribute('style')) : null;
    }
    if (!url) return null;
    const img = document.createElement('img');
    img.setAttribute('src', url);
    return img;
  };

  // Direct slide children (fallback to any descendant .slide for cross-page resilience).
  // The block element may itself be the `.slides` container or an ancestor of it.
  let slides = Array.from(element.querySelectorAll(':scope > .slide'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.slide'));

  const cells = [];

  slides.forEach((slide) => {
    // Skip carousel-JS clones (Slick etc.) that would duplicate rows
    if (slide.getAttribute('aria-hidden') === 'true' || /slick-cloned/.test(slide.className)) return;
    // Background/banner image: direct child img, else first img inside the slide,
    // else recover from the inline background-image the carousel JS applies.
    const image = normalizeImg(slide.querySelector(':scope > img') || slide.querySelector('img'))
      || imageFromBackground(slide);

    // Text content lives inside .slide-text (eyebrow span, heading, optional paragraph, CTA)
    const textRoot = slide.querySelector('.slide-text') || slide;
    const eyebrow = textRoot.querySelector('span.h4, span[class*="h4"], .h4');
    const heading = textRoot.querySelector('h1, h2, h3');
    const paragraph = textRoot.querySelector('p');
    const cta = textRoot.querySelector('a.button, a[class*="button"], a');

    // Skip empty/spacer slides
    if (!image && !heading && !eyebrow) return;

    const contentNodes = [eyebrow, heading, paragraph, cta].filter(Boolean);

    cells.push([
      fieldCell('media_image', image),
      fieldCell('content_text', ...contentNodes),
    ]);
  });

  // Empty-block guard: nothing extracted, unwrap
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-banner', cells });
  element.replaceWith(block);
}
