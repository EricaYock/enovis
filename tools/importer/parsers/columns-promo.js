/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo (base block: columns).
 * Source: https://enovis.com/ — closing "Creating Better Together" promo banner
 *   (section.background-color-primary-dark-primary)
 * Generated: 2026-07-30
 *
 * Columns block (dark promo variant): model is 2 columns x 1 content row. Per field-hinting
 * rules, Columns blocks do NOT get field:* comments — cells hold default content only.
 * Layout: tagline (left) | paragraph (right). The dark background + wave pattern are carried
 * by the block/variant styling, not the content.
 */
export default function parse(element, { document }) {
  const row = element.querySelector('.row') || element;

  // Two bootstrap columns: tagline column + paragraph column.
  let columns = Array.from(row.querySelectorAll(':scope > [class*="col-"]'))
    .filter((col) => col.textContent.trim() || col.querySelector('img'));

  if (!columns.length) columns = Array.from(row.children).filter((c) => c.textContent.trim());

  // Build one cell per column from its meaningful content (unwrap the col wrapper).
  const columnCells = columns.map((col) => {
    const content = Array.from(col.children).filter((c) => c.textContent.trim() || c.tagName === 'IMG' || c.querySelector?.('img'));
    return content.length ? content : [col];
  });

  // Empty-block guard
  if (!columnCells.length || columnCells.every((c) => !c.length)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [columnCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
