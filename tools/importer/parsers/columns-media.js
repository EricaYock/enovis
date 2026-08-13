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
    // ---- Press & Events variant: press-release list (left) | events schedule (right) ----
    // Both cells are rebuilt as clean flow content. CRITICAL: the events schedule must
    // NOT be emitted as a nested <table>. A <table> inside a block cell makes the xwalk
    // md2jcr converter misread the whole block as a multi-column/multi-row grid, which
    // both duplicates the events and corrupts the press-release heading links into pill
    // buttons. So the events are flattened into plain paragraphs instead.

    // Left: rebuild each press release as heading (title link) + date + summary. Titles
    // are emitted as headings (md2jcr -> "title" component, rendered as a heading), never
    // as a lone linked paragraph (which the boilerplate would decorate as a button).
    const pressItems = Array.from(element.querySelectorAll('.press-homepage .margin-bottom-2, .view-content > .margin-bottom-2'))
      .filter((el) => !el.closest('.attachment-after, .attachment'));
    const sourceItems = pressItems.length
      ? pressItems
      : Array.from(element.querySelectorAll('.press-homepage > .view-content > *'));

    const leftContent = [];
    sourceItems.forEach((item) => {
      const titleLink = item.querySelector('h1 a, h2 a, h3 a, h4 a, a');
      if (titleLink && (titleLink.textContent || '').trim()) {
        // Emit the press-release title as a PLAIN-TEXT heading (no anchor).
        // In the xwalk/JCR path, md2jcr's columns-block flattening unwraps a
        // single-child heading that contains a link down to the bare link,
        // which then renders as a pill "button" component. A plain-text heading
        // converts cleanly to a "title" component and matches the source's
        // heading hierarchy. (The press release remains reachable via the
        // section's "View All Press Releases" link.)
        const h = document.createElement('h3');
        h.textContent = (titleLink.textContent || '').trim();
        leftContent.push(h);
      }
      const time = item.querySelector('time');
      if (time && time.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = time.textContent.replace(/\s+/g, ' ').trim();
        leftContent.push(p);
      }
      const body = item.querySelector('.views-field-body .field-content, .field-content');
      if (body && body.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = body.textContent.replace(/\s+/g, ' ').trim();
        leftContent.push(p);
      }
    });

    // Right: flatten the events schedule table to one paragraph per event
    // (bold date range on top, event name below) — no nested <table>.
    const rightContent = [];
    const eventsTable = element.querySelector('.events-homepage table, .attachment-after table, .attachment table, table');
    if (eventsTable) {
      Array.from(eventsTable.querySelectorAll('tr')).forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll('td'));
        if (!tds.length) return;
        const dateText = (tds[0] ? tds[0].textContent : '').replace(/\s+/g, ' ').trim();
        const nameText = (tds[1] ? tds[1].textContent : '').replace(/\s+/g, ' ').trim();
        if (!dateText && !nameText) return;
        const p = document.createElement('p');
        if (dateText) {
          const strong = document.createElement('strong');
          strong.textContent = dateText;
          p.append(strong);
        }
        if (dateText && nameText) p.append(document.createElement('br'));
        if (nameText) p.append(document.createTextNode(nameText));
        rightContent.push(p);
      });
    }

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
