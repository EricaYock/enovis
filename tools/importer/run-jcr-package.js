#!/usr/bin/env node

/**
 * JCR Content-Package Runner (Universal Editor / xwalk)
 *
 * Re-runs the bundled import transform for a URL with JCR output enabled
 * (toJcr), then packages the resulting per-page JCR XML into an AEM
 * content-package ZIP via the helix-importer's createJcrPackage. The ZIP can
 * then be uploaded to an AEM author instance with:
 *   npx @adobe/aem-import-helper aem upload --zip <zip> --target <author> --token <token>
 *
 * This is the xwalk counterpart to run-bulk-import.js (which only emits DA
 * plain.html). It loads the same helix-importer bundle and the same bundled
 * import script, but feeds md2jcr the project's component models/definitions/
 * filters so field hints resolve to the correct Universal Editor fields.
 *
 * Usage:
 *   node tools/importer/run-jcr-package.js \
 *     --import-script tools/importer/import-homepage.bundle.js \
 *     --urls tools/importer/urls-homepage.txt \
 *     --site-path /content/enovis \
 *     --dam-path /content/dam/enovis \
 *     --package-name enovis-homepage \
 *     --out tools/importer/jcr
 */

import {
  readFileSync, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import JSZip from 'jszip';
import { md2jcr } from '@adobe/helix-md2jcr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      parsed[a] = args[i + 1];
      i += 1;
    }
  }
  return parsed;
}

const parsed = parseArgs();
const importScript = resolve(parsed['--import-script']);
const urlsFile = resolve(parsed['--urls']);
const sitePath = parsed['--site-path'] || '/content';
const damPath = parsed['--dam-path'] || '/content/dam';
const packageName = parsed['--package-name'] || 'content-package';
const outDir = resolve(parsed['--out'] || 'tools/importer/jcr');

// --extra-page lets us fold pre-built JCR page XML (e.g. nav/footer fragments
// that are authored/generated outside the URL scrape) into the same content
// package, so a single upload restores everything. Format (repeatable):
//   --extra-page /content/enovis/nav=migration-work/jcr-content/nav.xml
// Multiple pairs may be comma-separated, or the flag may be passed repeatedly.
const extraPageArgs = [];
process.argv.slice(2).forEach((a, i, arr) => {
  if (a === '--extra-page' && arr[i + 1]) extraPageArgs.push(arr[i + 1]);
});
const extraPages = extraPageArgs
  .flatMap((v) => v.split(','))
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) throw new Error(`--extra-page must be "jcrPath=file": ${pair}`);
    return { path: pair.slice(0, eq).trim(), file: resolve(pair.slice(eq + 1).trim()) };
  });

// helix-importer bundle (same one run-bulk-import.js injects)
const HELIX = '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/static/inject/helix-importer.js';

const helixImporterScript = readFileSync(HELIX, 'utf-8');
const importScriptContent = readFileSync(importScript, 'utf-8');
const urls = readFileSync(urlsFile, 'utf-8').split('\n').map((u) => u.trim()).filter(Boolean);

// Project UE config files. --config-dir defaults to the current working dir.
const configDir = resolve(parsed['--config-dir'] || process.cwd());
const models = JSON.parse(readFileSync(join(configDir, 'component-models.json'), 'utf-8'));
const definition = JSON.parse(readFileSync(join(configDir, 'component-definition.json'), 'utf-8'));
const filters = JSON.parse(readFileSync(join(configDir, 'component-filters.json'), 'utf-8'));

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const pages = [];
  for (const url of urls) {
    console.log(`[jcr] processing ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(3000);
    }

    // inject helix importer + bundled import script
    await page.evaluate((script) => {
      const el = document.createElement('script');
      el.textContent = script;
      document.head.appendChild(el);
    }, helixImporterScript);
    await page.evaluate((script) => {
      const el = document.createElement('script');
      el.textContent = script;
      document.head.appendChild(el);
    }, importScriptContent);

    await page.waitForFunction(
      () => typeof window.CustomImportScript !== 'undefined' && window.CustomImportScript?.default,
      { timeout: 15000 },
    );

    // Browser step: run the import transform to produce markdown only.
    const result = await page.evaluate(async ({ pageUrl }) => {
      const custom = window.CustomImportScript.default;
      if (typeof custom.onLoad === 'function') await custom.onLoad({ document });
      const r = await window.WebImporter.html2md(pageUrl, document, custom, {
        toDocx: false,
        toMd: true,
        originalURL: pageUrl,
      });
      return { path: r.path, md: r.md };
    }, { pageUrl: url });

    // Node step: markdown -> JCR XML via @adobe/helix-md2jcr, feeding the
    // project's Universal Editor models/definition/filters so field hints
    // resolve to the correct fields.
    let jcr = await md2jcr(result.md, { models, definition, filters });
    if (!jcr || typeof jcr !== 'string') {
      throw new Error(`md2jcr produced no XML for ${url}`);
    }

    // md2jcr writes external URLs (e.g. Widen DM query strings) into block
    // attribute values with raw `&` characters, which makes the JCR XML
    // not well-formed and fails the AEM package import. Escape bare
    // ampersands — those not already part of an entity (&amp; &lt; &#x3D; …).
    jcr = jcr.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

    let docPath = result.path || '/index';
    if (!docPath.startsWith('/')) docPath = `/${docPath}`;
    const jcrPath = `${sitePath}${docPath}`.replace(/\/+/g, '/');
    pages.push({ path: jcrPath, data: jcr, url });
    console.log(`[jcr]   -> ${jcrPath} (${jcr.length} bytes XML)`);
  }

  await browser.close();

  // Fold in any pre-built JCR pages (nav/footer fragments). These are already
  // valid JCR XML, so they bypass the scrape + md2jcr path — we just attach
  // them at the requested content path so they land in the same package.
  extraPages.forEach(({ path: extraPath, file }) => {
    if (!existsSync(file)) {
      throw new Error(`--extra-page file not found: ${file}`);
    }
    const data = readFileSync(file, 'utf-8');
    pages.push({ path: extraPath, data, url: `(prebuilt) ${file}` });
    console.log(`[jcr]   -> ${extraPath} (${data.length} bytes XML, prebuilt)`);
  });

  // Build the FileVault content-package ZIP in Node (the browser
  // createJcrPackage needs a File System Access dir handle, unavailable
  // headless). We replicate its structure: jcr_root/<path>/.content.xml per
  // page, intermediate cq:Page nodes, META-INF/vault/{filter,properties}.xml.
  console.log('[jcr] building content package ZIP (Node/jszip)...');
  const zip = new JSZip();
  const now = new Date().toISOString();

  const INTERMEDIATE_XML = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" '
    + 'xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" '
    + 'jcr:primaryType="cq:Page">\n'
    + '  <jcr:content cq:template="/libs/core/franklin/templates/page" jcr:primaryType="cq:PageContent" '
    + 'sling:resourceType="core/franklin/components/page/v1/page"/>\n</jcr:root>';

  const seen = new Set();
  const addContentXml = (jcrPath, xml) => {
    const path = `jcr_root${jcrPath}/.content.xml`;
    zip.file(path, xml);
  };

  // intermediate cq:Page nodes for every ancestor of each page
  pages.forEach((p) => {
    const parts = p.path.split('/').filter(Boolean); // e.g. content,enovis,index
    let acc = '';
    for (let i = 0; i < parts.length - 1; i += 1) {
      acc += `/${parts[i]}`;
      // don't synthesize the /content root itself
      if (acc === '/content') continue;
      if (!seen.has(acc)) {
        seen.add(acc);
        addContentXml(acc, INTERMEDIATE_XML);
      }
    }
    // the page node itself
    addContentXml(p.path, p.data);
  });

  // filter.xml — one <filter root> per page
  const filterEntries = pages.map((p) => `<filter root="${p.path}"></filter>`).join('\n      ');
  const filterXml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<workspaceFilter version="1.0">\n'
    + `      ${filterEntries}\n`
    + '    </workspaceFilter>';
  zip.file('META-INF/vault/filter.xml', filterXml);

  // properties.xml
  const propXml = "<?xml version='1.0' encoding='UTF-8'?>\n"
    + "<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>\n"
    + '<properties>\n'
    + '  <comment>FileVault Package Properties</comment>\n'
    + "  <entry key='description'></entry>\n"
    + "  <entry key='generator'>org.apache.jackrabbit.vault:3.7.1-T20231005151103-335689a8</entry>\n"
    + "  <entry key='packageType'>content</entry>\n"
    + "  <entry key='lastWrappedBy'>anonymous</entry>\n"
    + "  <entry key='packageFormatVersion'>2</entry>\n"
    + "  <entry key='group'>my_packages</entry>\n"
    + `  <entry key='created'>${now}</entry>\n`
    + "  <entry key='lastModifiedBy'>anonymous</entry>\n"
    + "  <entry key='buildCount'>1</entry>\n"
    + `  <entry key='lastWrapped'>${now}</entry>\n`
    + "  <entry key='version'></entry>\n"
    + "  <entry key='dependencies'></entry>\n"
    + "  <entry key='createdBy'>anonymous</entry>\n"
    + `  <entry key='name'>${packageName}</entry>\n`
    + `  <entry key='lastModified'>${now}</entry>\n`
    + '</properties>';
  zip.file('META-INF/vault/properties.xml', propXml);

  const zipPath = join(outDir, `${packageName}.zip`);
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  writeFileSync(zipPath, content);

  // also dump the raw JCR XML for inspection
  pages.forEach((p, i) => {
    writeFileSync(join(outDir, `page-${i}.content.xml`), p.data, 'utf-8');
  });

  console.log(`[jcr] ✅ wrote ${zipPath} (${content.length} bytes, ${pages.length} page(s))`);
}

main().catch((e) => {
  console.error('[jcr] FAILED:', e.message);
  process.exit(1);
});
