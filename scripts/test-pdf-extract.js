// Corpus verification for the text-first PDF pipeline. Run via:
//   npm run test:pdf -- [dir]                # offline: classify text layers
//   npm run test:pdf -- [dir] --oracle       # end-to-end: POST to the API and
//                                            # check extracted total vs filename
//
// The filename encodes the true grand total (e.g. "USD 423.43 RD.pdf"), which
// we use as an objective oracle. Offline mode needs no API key/server; oracle
// mode requires `npm run dev` running and the provider key in .env.local.
//
// Classification thresholds MIRROR lib/ai/pdfText.ts (source of truth). Keep
// them in sync if that file changes — this is a standalone dev utility that
// cannot import the TS module directly.
const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = '/Users/msaifee/Documents/Receipt';

// --- Mirrored from lib/ai/pdfText.ts -------------------------------------
const MIN_CHARS_PER_PAGE = 100;
const MIN_TOTAL_CHARS = 200;
const MAX_GARBLED_RATIO = 0.1;
const MAX_PDF_PAGES = 20;
const MAX_PDF_IMAGE_SIZE = 16_777_216;

function garbledRatio(text) {
  if (!text) return 1;
  let bad = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isReplacement = code === 0xfffd;
    const isControl =
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      (code >= 0x7f && code <= 0x9f);
    if (isReplacement || isControl) bad++;
  }
  return bad / text.length;
}
// ------------------------------------------------------------------------

/** Recursively collect files under `dir`. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Parse the "USD <amount>" oracle from a filename. */
function totalFromName(name) {
  const m = path.basename(name).match(/USD\s+([0-9]+(?:\.[0-9]{1,2})?)/i);
  return m ? parseFloat(m[1]) : null;
}

async function classify(file) {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const buffer = new Uint8Array(fs.readFileSync(file));
  const pdf = await getDocumentProxy(buffer, { maxImageSize: MAX_PDF_IMAGE_SIZE });
  try {
    const pageCount = pdf.numPages;
    if (pageCount < 1 || pageCount > MAX_PDF_PAGES) {
      return { pageCount, charCount: 0, charsPerPage: 0, garbled: 1, hasTextLayer: false };
    }
    const { text: pages } = await extractText(pdf, { mergePages: false });
    const text = pages
      .map((p, i) => `=== Page ${i + 1} ===\n${p.trim()}`)
      .join('\n\n');
    const charCount = pages.reduce((sum, p) => sum + p.trim().length, 0);
    const charsPerPage = charCount / pageCount;
    const garbled = garbledRatio(text);
    const hasTextLayer =
      charsPerPage >= MIN_CHARS_PER_PAGE &&
      charCount >= MIN_TOTAL_CHARS &&
      garbled <= MAX_GARBLED_RATIO;
    return { pageCount, charCount, charsPerPage, garbled, hasTextLayer };
  } finally {
    try {
      await pdf.cleanup();
    } catch {
      // ignore cleanup errors
    }
  }
}

async function runOracle(file, provider, baseUrl) {
  const buffer = fs.readFileSync(file);
  const form = new FormData();
  const type = file.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  form.append('file', new Blob([buffer], { type }), path.basename(file));
  form.append('provider', provider);

  const res = await fetch(`${baseUrl}/api/process-receipt`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.error || `HTTP ${res.status}` };
  }
  return {
    ok: true,
    total: json.data?.total,
    itemCount: json.metadata?.itemCount,
    mode: json.metadata?.mode,
    pageCount: json.metadata?.pageCount,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const oracle = args.includes('--oracle');
  const dir = args.find((a) => !a.startsWith('--')) || DEFAULT_DIR;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const provider = process.env.PROVIDER || 'openai';

  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = walk(dir);
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  const images = files.filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f));

  console.log(`\n📂 ${dir}`);
  console.log(`   ${pdfs.length} PDFs, ${images.length} images\n`);

  if (!oracle) {
    console.log('🔍 Text-layer classification (offline)\n');
    let textLayer = 0;
    for (const file of pdfs) {
      try {
        const c = await classify(file);
        if (c.hasTextLayer) textLayer++;
        const tag = c.hasTextLayer ? 'TEXT  ' : 'VISION';
        console.log(
          `  [${tag}] ${path.basename(file)} — ${c.pageCount}p, ${c.charCount} chars ` +
            `(${Math.round(c.charsPerPage)}/pg, garbled ${(c.garbled * 100).toFixed(1)}%)`
        );
      } catch (err) {
        console.log(`  [ERROR ] ${path.basename(file)} — ${err.message}`);
      }
    }
    console.log(
      `\n✅ ${textLayer}/${pdfs.length} PDFs would use the TEXT path; ` +
        `${pdfs.length - textLayer} + ${images.length} image(s) use VISION.\n`
    );
    return;
  }

  console.log(`🔮 Oracle check via ${baseUrl} (provider: ${provider})\n`);
  let pass = 0;
  let checked = 0;
  for (const file of [...pdfs, ...images]) {
    const expected = totalFromName(file);
    if (expected == null) continue;
    checked++;
    try {
      const r = await runOracle(file, provider, baseUrl);
      if (!r.ok) {
        console.log(`  [FAIL ] ${path.basename(file)} — ${r.error}`);
        continue;
      }
      const ok = typeof r.total === 'number' && Math.abs(r.total - expected) <= 0.01;
      if (ok) pass++;
      console.log(
        `  [${ok ? 'PASS' : 'DIFF'}] ${path.basename(file)} — ` +
          `expected ${expected}, got ${r.total} (${r.mode}, ${r.itemCount} items` +
          `${r.pageCount ? `, ${r.pageCount}p` : ''})`
      );
    } catch (err) {
      console.log(`  [ERROR] ${path.basename(file)} — ${err.message}`);
    }
  }
  console.log(`\n✅ ${pass}/${checked} matched the filename total (±0.01).\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
