/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-video (base block: cards).
 * Source: https://enovis.com/ — Featured videos grid (.featured-videos-homepage)
 * Generated: 2026-07-30
 *
 * Container block. Each `.node--type-education-video` (a video thumbnail) becomes one row
 * (a "Card"). Model (card):
 *   - image (reference) -> cell 1 (field hint image): the poster/thumbnail <img>
 *   - text  (richtext)  -> cell 2 (field hint text): the video title heading
 *
 * The card's second inline <img> inside `.video-title` is a decorative play-icon and is
 * intentionally excluded. Poster images may be Widen DM URLs; the <img> lands in its
 * natural `image` slot for the DM-images transformer to convert to a carrier anchor later.
 */
export default function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => [document.createComment(` field:${name} `), ...nodes.filter(Boolean)];

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

  // Each video node is one card. Fallbacks for cross-page structure variation.
  let nodes = Array.from(element.querySelectorAll('.node--type-education-video'));
  if (!nodes.length) nodes = Array.from(element.querySelectorAll('.video-thumbnail'));
  if (!nodes.length) nodes = Array.from(element.querySelectorAll('.col-sm-4'));

  const cells = [];

  nodes.forEach((node) => {
    // Poster image: prefer the thumbnail in `.vid-thumb`, fall back to first non-icon img
    let poster = node.querySelector('.vid-thumb img');
    if (!poster) {
      poster = Array.from(node.querySelectorAll('img'))
        .find((img) => !img.closest('.video-title')) || node.querySelector('img');
    }
    poster = normalizeImg(poster);

    // Title text: heading within the card
    const title = node.querySelector('.video-title h1, .video-title h2, .video-title h3, .video-title h4, h1, h2, h3, h4');

    // Skip empty cards
    if (!poster && !title) return;

    cells.push([
      fieldCell('image', poster),
      fieldCell('text', title),
    ]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-video', cells });
  element.replaceWith(block);
}
