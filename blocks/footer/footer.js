import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Resolves the content site root from the current page path so the footer
 * fragment resolves in every environment:
 *   - AEM author/preview: pages live at /content/<site>/... -> root /content/<site>
 *   - local dev / published: pages live at the domain root -> root '' (i.e. /footer)
 * A `footer` page-metadata value always overrides this.
 */
function getSiteRoot() {
  const match = window.location.pathname.match(/^(\/content\/[^/]+)/);
  return match ? match[1] : '';
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment. The default path is anchored to the site root so it
  // works both on AEM (/content/<site>/footer) and locally/published (/footer).
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : `${getSiteRoot()}/footer`;
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
