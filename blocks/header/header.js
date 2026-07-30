import { getMetadata } from '../../scripts/aem.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // Keep top-level submenus collapsed when the mobile menu opens — they expand
  // one at a time as an accordion when the user taps a row (matches source UX).
  toggleAllNavSections(navSections, 'false');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

function getDirectTextContent(menuItem) {
  const menuLink = menuItem.querySelector(':scope > :where(a,p)');
  if (menuLink) {
    return menuLink.textContent.trim();
  }
  return Array.from(menuItem.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ');
}

async function buildBreadcrumbsFromNavTree(nav, currentUrl) {
  const crumbs = [];

  const homeUrl = document.querySelector('.nav-brand a[href]').href;

  let menuItem = Array.from(nav.querySelectorAll('a')).find((a) => a.href === currentUrl);
  if (menuItem) {
    do {
      const link = menuItem.querySelector(':scope > a');
      crumbs.unshift({ title: getDirectTextContent(menuItem), url: link ? link.href : null });
      menuItem = menuItem.closest('ul')?.closest('li');
    } while (menuItem);
  } else if (currentUrl !== homeUrl) {
    crumbs.unshift({ title: getMetadata('og:title'), url: currentUrl });
  }

  const placeholders = await fetchPlaceholders();
  const homePlaceholder = placeholders.breadcrumbsHomeLabel || 'Home';

  crumbs.unshift({ title: homePlaceholder, url: homeUrl });

  // last link is current page and should not be linked
  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1].url = null;
  }
  crumbs[crumbs.length - 1]['aria-current'] = 'page';
  return crumbs;
}

async function buildBreadcrumbs() {
  const breadcrumbs = document.createElement('nav');
  breadcrumbs.className = 'breadcrumbs';

  const crumbs = await buildBreadcrumbsFromNavTree(document.querySelector('.nav-sections'), document.location.href);

  const ol = document.createElement('ol');
  ol.append(...crumbs.map((item) => {
    const li = document.createElement('li');
    if (item['aria-current']) li.setAttribute('aria-current', item['aria-current']);
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.title;
      li.append(a);
    } else {
      li.textContent = item.title;
    }
    return li;
  }));

  breadcrumbs.append(ol);
  return breadcrumbs;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment. Default path resolves relative to the site content
  // root: the Enovis content tree is mounted under /content, so the nav fragment
  // lives at /content/nav. In production, a `nav` metadata value overrides this.
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/content/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    // Tag the top-level nav <ul> so CSS can target it regardless of whether the
    // EDS scaffold wraps it in a .default-content-wrapper.
    const topList = navSections.querySelector(':scope .default-content-wrapper > ul, :scope > ul');
    if (topList) topList.classList.add('nav-list');

    // Top-level items that own a submenu become hoverable/clickable dropdowns.
    const topSelector = ':scope .default-content-wrapper > ul > li, :scope > ul > li';
    navSections.querySelectorAll(topSelector).forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      // Desktop: open on hover (matches source), close when the pointer leaves.
      navSection.addEventListener('mouseenter', () => {
        if (isDesktop.matches && navSection.querySelector('ul')) {
          navSection.setAttribute('aria-expanded', 'true');
        }
      });
      navSection.addEventListener('mouseleave', () => {
        if (isDesktop.matches) navSection.setAttribute('aria-expanded', 'false');
      });
      // Click toggles (desktop tap / mobile accordion).
      navSection.addEventListener('click', (e) => {
        if (!navSection.querySelector('ul')) return;
        // Let links inside an open panel (child li) navigate normally.
        const insideChild = e.target.closest('li') !== navSection;
        if (insideChild) return;
        // On mobile, the top-level row toggles its accordion instead of
        // navigating — the source parent items are section headers, not pages.
        if (!isDesktop.matches && e.target.closest('a')) {
          e.preventDefault();
        }
        const expanded = navSection.getAttribute('aria-expanded') === 'true';
        if (isDesktop.matches) {
          toggleAllNavSections(navSections);
        }
        navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    });
    navSections.querySelectorAll('.button-container').forEach((buttonContainer) => {
      buttonContainer.classList.remove('button-container');
      const btn = buttonContainer.querySelector('.button');
      if (btn) btn.classList.remove('button');
    });
  }

  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const toolsList = navTools.querySelector('ul');
    if (toolsList) toolsList.classList.add('nav-tools-list');

    // Replace the utility text labels with the source's SVG icons on desktop.
    // Each icon is matched by the link's href/label; the visible text is kept
    // as an aria-label / mobile label so the menu stays accessible and readable
    // when the labels show inside the mobile drawer.
    const TOOL_ICONS = {
      search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19.55 20.575-6.3-6.275q-.75.625-1.725.975-.975.35-2 .35-2.575 0-4.35-1.775Q3.4 12.075 3.4 9.5q0-2.55 1.775-4.338 1.775-1.787 4.35-1.787 2.55 0 4.325 1.775 1.775 1.775 1.775 4.35 0 1.075-.35 2.05-.35.975-.95 1.7l6.275 6.275ZM9.525 14.125q1.925 0 3.263-1.35 1.337-1.35 1.337-3.275 0-1.925-1.337-3.275-1.338-1.35-3.263-1.35-1.95 0-3.287 1.35Q4.9 7.575 4.9 9.5q0 1.925 1.338 3.275 1.337 1.35 3.287 1.35Z"/></svg>',
      order: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.85 19.55q-1.175 0-1.988-.812-.812-.813-.812-1.988h-1.7V6.3q0-.75.525-1.275Q2.4 4.5 3.15 4.5h13.625v3.8h2.65l3.225 4.325v4.125h-1.8q0 1.175-.825 1.988-.825.812-2 .812-1.15 0-1.975-.812-.825-.813-.825-1.988H8.65q0 1.175-.812 1.988-.813.812-1.988.812Zm0-1.5q.55 0 .925-.375t.375-.925q0-.55-.375-.925t-.925-.375q-.55 0-.925.375t-.375.925q0 .55.375.925t.925.375Zm-3-2.8h.725q.325-.55.925-.925.6-.375 1.35-.375.725 0 1.338.362.612.363.937.938h7.15V6H3.15q-.1 0-.2.1t-.1.2Zm15.2 2.8q.55 0 .925-.375t.375-.925q0-.55-.375-.925t-.925-.375q-.55 0-.937.375-.388.375-.388.925t.388.925q.387.375.937.375Zm-1.275-4.8h4.475l-2.6-3.45h-1.875Z"/></svg>',
      location: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.75q.725 0 1.238-.512.512-.513.512-1.238t-.512-1.238Q12.725 8.25 12 8.25t-1.238.512q-.512.513-.512 1.238t.512 1.238q.513.512 1.238.512Zm0 8.05q3.1-2.75 4.675-5.263 1.575-2.512 1.575-4.337 0-2.85-1.812-4.65-1.813-1.8-4.438-1.8t-4.438 1.8Q5.75 7.35 5.75 10.2q0 1.825 1.575 4.337Q8.9 17.05 12 19.8Zm0 2q-3.9-3.4-5.825-6.3-1.925-2.9-1.925-5.3 0-3.625 2.338-5.788Q8.925 2.25 12 2.25q3.075 0 5.413 2.162Q19.75 6.575 19.75 10.2q0 2.4-1.925 5.3T12 21.8Z"/></svg>',
      flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6v11h16V6Zm15 10H5v-1h14Zm0-2H5v-1.12h14Zm0-2h-7v-1h7Zm0-2h-7v-1h7Zm0-2h-7v-1h7Z"/></svg>',
    };
    const iconFor = (a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      const label = a.textContent.toLowerCase();
      if (href.includes('search') || label.includes('search')) return 'search';
      if (href.includes('order') || label.includes('order')) return 'order';
      if (label.includes('surgeon') || label.includes('sales rep') || href.includes('locator')) return 'location';
      if (label.includes('international') || href.includes('international')) return 'flag';
      return null;
    };
    navTools.querySelectorAll('a').forEach((a) => {
      const key = iconFor(a);
      if (!key) return;
      const label = a.textContent.trim();
      a.setAttribute('aria-label', label);
      a.setAttribute('title', label);
      // keep the label text as a mobile-only span; icon shows on desktop
      a.innerHTML = `<span class="nav-tool-icon">${TOOL_ICONS[key]}</span><span class="nav-tool-label">${label}</span>`;
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // Transparent-over-hero behavior: the source header is transparent while the
  // page is scrolled to the top (dark hero shows through, white logo), and turns
  // solid white once the user scrolls past the hero. Only enable on the homepage
  // where the first section is a full-bleed dark hero.
  const hasHero = !!document.querySelector('main .carousel-banner, main .carousel');
  if (hasHero) {
    // Let the hero sit under the floating/transparent header (no reserved
    // spacer) — matches the source where the nav overlaps the banner.
    document.body.classList.add('has-hero-header');
    const applyTransparency = () => {
      if (window.scrollY < 80 && isDesktop.matches) {
        navWrapper.classList.add('nav-transparent');
      } else {
        navWrapper.classList.remove('nav-transparent');
      }
    };
    applyTransparency();
    window.addEventListener('scroll', applyTransparency, { passive: true });
    isDesktop.addEventListener('change', applyTransparency);
  }

  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    navWrapper.append(await buildBreadcrumbs());
  }
}
