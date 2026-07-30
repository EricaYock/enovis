/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media (base block: columns).
 * Source: https://enovis.com/ — used by several two-column sections:
 *   - CSR / patient-care / careers media sections (section.padding-top-2): image | text
 *   - Press & Events region (.press-events): press-release list | events schedule table
 * Generated: 2026-07-30
 *
 * Columns block: model is 2 columns x 1 content row. Per field-hinting rules, Columns
 * blocks do NOT get field:* comments — cells hold default content only.
 *
 * Image handling: media images are Widen Dynamic Media URLs; the <img> is left in the
 * cell and the DM-images transformer converts it to a carrier anchor downstream.
 */
export default function parse(element, { document }) {
  const normalizeImg = (img) => {
    if (!img) return img;
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
  // ensure every <img> inside a set of nodes has a resolvable src
  const fixImgs = (nodes) => {
    nodes.forEach((n) => {
      if (n && n.tagName === 'IMG') normalizeImg(n);
      else if (n && n.querySelectorAll) n.querySelectorAll('img').forEach(normalizeImg);
    });
    return nodes;
  };

  const isPress = element.classList.contains('press-events')
    || element.querySelector('.press-homepage, .events-homepage, .press-events');

  const cells = [];

  if (isPress) {
    // ---- Press & Events variant: press-release list (left) | events table (right) ----
    // Left: the press-release items (exclude anything living in the events attachment).
    const pressItems = Array.from(element.querySelectorAll('.press-homepage .margin-bottom-2, .view-content > .margin-bottom-2'))
      .filter((el) => !el.closest('.attachment-after, .attachment'));
    const leftContent = fixImgs(pressItems.length ? pressItems : Array.from(element.querySelectorAll('.press-homepage > .view-content > *')));

    // Right: the events schedule table.
    const eventsTable = element.querySelector('.events-homepage table, .attachment-after table, .attachment table, table');
    const rightContent = fixImgs([eventsTable].filter(Boolean));

    if (!leftContent.length && !rightContent.length) {
      element.replaceWith(...element.childNodes);
      return;
    }

    // Default content that surrounds the block (section heading + "view all" CTA) — keep
    // it in the DOM as default content, outside the columns block.
    const title = element.querySelector('h2.block-title, .block-title');
    const footerCta = element.querySelector('footer.view-footer a.button, .view-footer a.button, .view-footer a');

    cells.push([leftContent, rightContent]);

    const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
    if (title) element.before(title);
    element.replaceWith(block);
    if (footerCta) block.after(footerCta);
    return;
  }

  // ---- Media section variant: two bootstrap columns (image | text or text | image) ----
  const row = element.querySelector('.row') || element;
  let columns = Array.from(row.querySelectorAll(':scope > [class*="col-"]'))
    .filter((col) => col.querySelector('img, h1, h2, h3, h4, p, a') || col.textContent.trim());

  // Fallback: if no bootstrap columns matched, treat any direct content children as columns.
  if (!columns.length) columns = Array.from(row.children);

  // Reorder to visual left-to-right using bootstrap push/pull classes (rc9 is reversed).
  const offset = (col) => {
    const cls = col.className || '';
    const push = (cls.match(/col-\w+-push-(\d+)/) || [])[1];
    const pull = (cls.match(/col-\w+-pull-(\d+)/) || [])[1];
    return (push ? Number(push) : 0) - (pull ? Number(pull) : 0);
  };
  const ordered = columns
    .map((col, i) => ({ col, i, key: i + offset(col) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.col);

  // Build one cell per column from the column's content nodes (unwrap the col wrapper).
  const columnCells = ordered.map((col) => {
    const content = Array.from(col.children).filter((c) => c.textContent.trim() || c.tagName === 'IMG' || c.querySelector?.('img'));
    return fixImgs(content.length ? content : [col]);
  });

  if (!columnCells.length || columnCells.every((c) => !c.length)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  cells.push(columnCells);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
