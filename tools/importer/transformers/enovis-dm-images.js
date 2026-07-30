/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Enovis Dynamic Media image carriers (Widen / Scene7 / DM Open API).
 *
 * Converts Dynamic Media `<img>` tags in the parsed DOM into anchors so the
 * source URL (with all rendition query parameters) round-trips through the
 * docx -> markdown pipeline intact. On the client side, a companion auto-block
 * in `scripts/scripts.js` (installed by the site-migration orchestrator)
 * rebuilds those anchors into responsive `<picture>` elements at load time.
 *
 * Runs in `afterTransform` ONLY. Block parsers run between beforeTransform and
 * afterTransform and extract `<img>` references into block cells (carousel /
 * columns image cells here). Rewriting imgs to anchors in beforeTransform would
 * leave parsers with no img and produce empty cells. Running afterTransform
 * lets parsers build their cells first; we then walk the parser-modified DOM and
 * rewrite DM imgs wherever they ended up.
 *
 * -----------------------------------------------------------------------------
 * DEVIATION FROM references/dm-scene7-transformer.md (documented intentionally):
 *
 * The canonical detector matches only Scene7 IS/Image (`/is/image/`) and DM
 * Open API (`delivery-p*-e*.adobeaemcloud.com` + `/adobe/assets/urn:`). The
 * standard STEP 4 gate returned ZERO hits for enovis.com.
 *
 * enovis.com instead serves its Dynamic Media assets from a Widen DAM
 * (`enovis.widen.net/content/<id>/<format>/<file>?<render-params>`), verified
 * in migration-work/metadata.json `.images.mapping` (6 URLs) and preserved
 * verbatim in migration-work/cleaned.html `<img src>`. The user explicitly
 * requested these be preserved as carrier anchors. `detectDynamicMediaUrl` is
 * therefore extended with a `'widen'` family branch. All other transformer
 * behavior (href/title carriers, mixed-content skip, empty-alt sentinel)
 * follows the canonical template unchanged.
 *
 * ⚠️ Companion requirement: the auto-block installed into `scripts/scripts.js`
 * MUST also recognize the `'widen'` family and provide a Widen rendition builder
 * (Widen resizes via the `w`/`h` query params, e.g. `?w=2000`; format lives in
 * the path segment). If the auto-block ships without Widen support, these
 * anchors still navigate to the full-size asset (progressive enhancement) but
 * won't be upgraded to responsive `<picture>`. The `detectDynamicMediaUrl`
 * copy here and in the auto-block must stay byte-identical.
 * -----------------------------------------------------------------------------
 */

// ---- Begin canonical helpers (keep byte-identical with the scripts.js copy) ----
function detectDynamicMediaUrl(urlStr) {
  let u;
  try { u = new URL(urlStr, 'https://x/'); } catch { return false; }
  // Scene7 detected by path alone — hostname is irrelevant because
  // customer sites routinely CNAME a vanity domain to Scene7.
  if (u.pathname.startsWith('/is/image/')) {
    return 'scene7';
  }
  // Adobe DM Open API (publish tier).
  if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname)
      && u.pathname.startsWith('/adobe/assets/urn:')) {
    return 'dm-openapi';
  }
  // Widen DAM (Acquia). enovis serves its Dynamic Media from a Widen account:
  // https://<account>.widen.net/content/<id>/<format>/<file>?<render-params>.
  // Match any *.widen.net host with a /content/ path. See DEVIATION note above.
  if (/(^|\.)widen\.net$/.test(u.hostname) && u.pathname.startsWith('/content/')) {
    return 'widen';
  }
  return false;
}

// Walk up from a DM <img> through allow-listed inline wrappers (currently just
// <picture>) to find the carrier anchor for the linked-image round-trip.
// Returns the outer <a> when the img is the sole meaningful descendant; null
// otherwise. Keep byte-identical with dm-scene7-helpers.js.
const LINKED_DM_INLINE_WRAPPER_TAGS = new Set(['PICTURE']);
const LINKED_DM_WRAPPER_SIBLING_TAGS = new Set(['SOURCE']); // standard <picture> siblings
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
  if (!parent || parent.tagName !== 'A') return null;
  if (parent.children.length !== 1 || parent.children[0] !== node) return null;
  if (parent.textContent.trim() !== '') return null;
  return parent;
}

const EMPTY_ALT_SENTINEL = 'Image without alt text';

function altToLinkText(alt) {
  return alt || EMPTY_ALT_SENTINEL;
}
// ---- End canonical helpers ----

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const doc = element.ownerDocument;

  element.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!detectDynamicMediaUrl(src)) return;

    // Preserve alt verbatim, including empty string for decorative images.
    // The auto-block uses the URL pattern (not the text) to find these anchors,
    // so link text is purely a Document-view UX cue. Empty alt is substituted
    // with EMPTY_ALT_SENTINEL so authors see a visible cell at the image's
    // position; the auto-block translates the sentinel back to alt="".
    const alt = img.getAttribute('alt') || '';

    // Linked image (incl. parser-wrapped `<a><picture><img></picture></a>`).
    // Stash DM URL in title, keep outer href; setting textContent replaces any
    // wrapper descendants with the link text.
    const linkedAnchor = findLinkedDmCarrier(img);
    if (linkedAnchor) {
      linkedAnchor.setAttribute('title', src);
      linkedAnchor.textContent = altToLinkText(alt);
      return;
    }

    // Inside an anchor but not a sole-meaningful-child shape — mixed content.
    // No clean single-anchor markdown representation; skip.
    const parent = img.parentElement;
    if (parent && parent.tagName === 'A') {
      // eslint-disable-next-line no-console
      console.warn('DM image inside mixed-content anchor, skipped:', src);
      return;
    }

    // Unlinked image: create an anchor whose href is the DM URL.
    const a = doc.createElement('a');
    a.href = src;
    a.textContent = altToLinkText(alt);
    img.replaceWith(a);
  });
}
