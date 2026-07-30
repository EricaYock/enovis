/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Enovis site-wide cleanup.
 *
 * Removes non-authorable site chrome (cookie consent, global search overlay,
 * masthead header/navigation, site footer, Drupal system markup) so the import
 * contains only page-level authorable content.
 *
 * All selectors verified against migration-work/cleaned.html for
 * https://enovis.com/ (Drupal 10). Source line references noted inline.
 *
 * IMPORTANT: the site footer is removed by its ID (`#footer`, cleaned.html
 * line 2499) — NOT by the `footer` tag. An authorable `<footer class="view-footer">`
 * (cleaned.html line 2464) lives inside the `.press-events` block and is
 * referenced by the homepage template (defaultContent
 * `.press-events footer.view-footer a.button`), so a blanket `footer` removal
 * would delete authorable content.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Osano cookie consent management window (cleaned.html lines 2-32).
    // Removed before parsing so it never interferes with block matching.
    WebImporter.DOMUtils.remove(element, [
      '.osano-cm-window',
      '.osano-visually-hidden',
    ]);

    // Global search overlay bar (cleaned.html line 40) — site chrome, not
    // authorable page content.
    WebImporter.DOMUtils.remove(element, [
      '.global-search-bar',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome. Selectors from captured DOM:
    //  - header             : masthead + all nav menus (cleaned.html line 66-2108)
    //  - #footer            : site footer (cleaned.html line 2499). ID-scoped on
    //                         purpose — see file header note about footer.view-footer.
    //  - a.menu-toggle      : mobile menu toggle inside header (defensive)
    //  - #messages          : Drupal system messages container (cleaned.html line 2262)
    //  - a[href="#main-content"] : Drupal skip-to-content link (cleaned.html line 33)
    //  - #main-content      : empty skip-link anchor target inside main (cleaned.html line 2269)
    //  - iframe             : non-authorable embed (cleaned.html line 31)
    //  - link               : stray stylesheet link (cleaned.html line 36)
    WebImporter.DOMUtils.remove(element, [
      // Osano cookie consent (lit-html web component). Also removed in
      // beforeTransform, but the dialog is populated after that snapshot on
      // some renders, so re-remove here where removal is reliable. Broad
      // attribute selectors catch every osano-* container variant.
      '.osano-cm-window',
      '.osano-visually-hidden',
      '[class*="osano-cm"]',
      '[id*="osano"]',
      'header',
      '#footer',
      '#messages',
      'a[href="#main-content"]',
      '#main-content',
      'iframe',
      'link',
      'noscript',
      // Mmenu off-canvas mobile navigation. The Mmenu JS relocates the
      // #mobile-menu <nav> (and its blocker overlay) to body level at runtime,
      // so it escapes the `header` removal above and would otherwise dump the
      // entire mega-menu (#mm-* panels) at the top of the imported document.
      '#mobile-menu',
      '.mm-menu',
      '.mm-wrapper__blocker',
      // jQuery UI autocomplete menu injected at body level by the search widget.
      '#ui-id-1',
      // AddToAny share bar + HubSpot web-interactive anchors (marketing chrome,
      // not authorable page content).
      '#addtoany',
      '[id^="hs-web-interactives-"]',
      // Residual "Close menu" anchor that targets the Mmenu slideout wrapper.
      'a[href="#mm-0"]',
    ]);

    // Osano cookie-consent fallback removal by content signature. The Osano
    // dialog is a lit-html web component; in the importer's captured DOM it is
    // frequently serialized mid-hydration with its `osano-*` classes stripped
    // (only lit comment placeholders + consent text survive), so the class /
    // id selectors above miss it. Remove any top-level element that carries the
    // unique consent-control strings ("Deny Non-Essential" / "Storage
    // Preferences") — phrases that never appear in authorable page content.
    // Osano cookie-consent fallback removal by content signature. The Osano
    // dialog is a reactive lit-html web component: it re-renders into the live
    // document.body asynchronously, so class/id-based removal doesn't stick and
    // the import script additionally serializes from a detached clone (see
    // import-homepage.js). This synchronous signature sweep removes any element
    // carrying the unique consent-control strings ("Deny Non-Essential" /
    // "Storage Preferences") whenever it IS present at transform time — phrases
    // that never appear in authorable page content. Deepest-match only, so we
    // don't remove a page ancestor that merely contains the consent subtree.
    const OSANO_SIGNATURE = /Deny Non-Essential|Storage Preferences/;
    const osanoMatches = Array.from(element.querySelectorAll('*')).filter(
      (el) => OSANO_SIGNATURE.test(el.textContent || ''),
    );
    osanoMatches
      .filter((el) => !osanoMatches.some((other) => other !== el && el.contains(other)))
      .forEach((el) => el.remove());

    // Strip Drupal/analytics tracking + inline behavior attributes wherever
    // present in the captured DOM. Safe no-op when an attribute is absent.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-drupal-messages');
      el.removeAttribute('data-drupal-selector');
      el.removeAttribute('data-once');
    });
  }
}
