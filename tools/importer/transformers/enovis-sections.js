/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Enovis section breaks + section metadata.
 *
 * Driven by `payload.template.sections` (homepage template has 7 sections).
 * For each section, using the section selectors from page-templates.json
 * (all verified against migration-work/cleaned.html):
 *   - inserts a `<hr>` before the section's first element for every section
 *     except the first (section breaks: expected 6 = sections.length - 1);
 *   - inserts a "Section Metadata" block after the section when the section
 *     has a `style` (only `rc5` / "Featured videos grid" has style "dark",
 *     so expected 1 Section Metadata block).
 *
 * Sections are processed in reverse order so that inserting `<hr>` / metadata
 * blocks does not shift the DOM positions of sections not yet processed.
 *
 * Section selectors (all present in migration-work/cleaned.html):
 *   rc4   Hero carousel                -> .top-slider
 *   rc5   Featured videos grid (dark)  -> #content-top
 *   intro Company intro statement      -> #node-1 .field__item > section.padding-top-2:nth-of-type(1)
 *   rc8   CSR                          -> ...:nth-of-type(2)
 *   rc9   Transforming patient care    -> ...:nth-of-type(3)
 *   rc10  Working at Enovis            -> ...:nth-of-type(4)
 *   rc11  Press & Events + banner      -> #content-bottom
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

/**
 * Resolve the first matching element for a section from its list of
 * candidate selectors (page-templates.json stores selectors as arrays).
 */
function findSectionElement(element, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    try {
      const el = element.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // Invalid selector — skip and try the next candidate.
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections)
    ? template.sections
    : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument;

  // Reverse order keeps earlier sections' resolved elements valid while we
  // mutate the DOM around later sections.
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const section = sections[i];
    const target = findSectionElement(element, section.selector);
    if (!target) {
      // eslint-disable-next-line no-console
      console.warn('Section element not found for section:', section.id, section.selector);
      continue;
    }

    // Section Metadata block for sections that declare a style.
    if (section.style) {
      const metaBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      if (target.parentNode) {
        target.parentNode.insertBefore(metaBlock, target.nextSibling);
      }
    }

    // Section break before every section except the first.
    if (i > 0) {
      const hr = doc.createElement('hr');
      if (target.parentNode) {
        target.parentNode.insertBefore(hr, target);
      }
    }
  }
}
