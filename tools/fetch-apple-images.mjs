#!/usr/bin/env node
/**
 * fetch-apple-images.mjs
 * ----------------------
 * Downloads the official product shots from Apple's own CDN and writes them into
 * assets/products/, replacing the placeholder artwork that ships with the repo.
 *
 * The build sandbox this site was authored in has no route to Apple's CDN, so the
 * committed images are neutral stand-ins. Run this once on any machine with normal
 * internet access and the catalogue will use Apple's real photography.
 *
 *   node tools/fetch-apple-images.mjs           # download + convert
 *   node tools/fetch-apple-images.mjs --check   # just report reachability
 *
 * Requires Node 18+ (global fetch). No npm install needed.
 * Optional: if `cwebp` is on PATH the downloads are converted to .webp,
 * otherwise the original .jpg/.png is kept and index.html is repointed.
 */

import { writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets', 'products');
const CDN = 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/';

/** slug -> Apple Store image id + cache-busting .v token, as published on apple.com/store */
const IMAGES = {
  'iphone-17-pro': ['iphone-card-40-17pro-202509', 'WVVFRzUzVk1oblJhbW9PbGNSU25jaUtlSkZ1cHdCU1J4ZWZjamdoYzhpRkMxQXc4S3pBZE5lUDJlTzVYSUYydFMwV0hhcmdVdXZzZ1NwTlFUaEgwTDc0akx0V0lSSVRoL2tPb3ZabW5DM0k', 'p-jpg'],
  'iphone-17-pro-max': ['iphone-card-40-17pro-202509', 'WVVFRzUzVk1oblJhbW9PbGNSU25jaUtlSkZ1cHdCU1J4ZWZjamdoYzhpRkMxQXc4S3pBZE5lUDJlTzVYSUYydFMwV0hhcmdVdXZzZ1NwTlFUaEgwTDc0akx0V0lSSVRoL2tPb3ZabW5DM0k', 'p-jpg'],
  'iphone-air': ['iphone-card-40-17air-202509', 'WVVFRzUzVk1oblJhbW9PbGNSU25jci9mUU0zMkc5ekxlZHFEM05NWkp3NUMxQXc4S3pBZE5lUDJlTzVYSUYydForTkxLOU9JWjNBQWJrTnVsdGlCbU9UZHJHS0dDSWYyeUtQd0tjOERiaFE', 'p-jpg'],
  'iphone-17': ['iphone-card-40-17-202509', 'WVVFRzUzVk1oblJhbW9PbGNSU25jaVVYemprcUVJOVFFWHE5dFpoU3I4STgycjlDNGdlREhyeERCVjM1SXkycjBBTjk5NkRJNU5rZVVhNVlmWUlUM2U3OVV5YWxuQ1ltOTRFL2xza1R6dzQ', 'p-jpg'],
  'iphone-17e': ['iphone-card-40-17e-202603', 'WVVFRzUzVk1oblJhbW9PbGNSU25jcDV3bGxUYTNFRGViYzhxQm4xNjRwK3duZUlmMUw1alNIdXhJaHpPYTE3V2E1d2RwelVINHF4YkhRZEpJKzNmaS9sRjZyQkN5cFJNb0EwbmNweTFnWEU', 'p-jpg'],

  'macbook-air': ['mac-card-40-macbook-air-202503', 'dzRRdVl2UHpmd3BrL2dpaGRDY2RKN3dnWXpNRUFSbE1veTFaYXZqWDhWZ2w2T29GWFRmcGlRaHRKa2ZZeG54SDAzOVFHb3N0MkVmS01ZcFh0d1Y4R214T1llZGE4TXpwbzJQenRlM3YzbGc', 'png-alpha'],
  'macbook-pro': ['mac-card-40-macbookpro-14-16-202410', 'dzRRdVl2UHpmd3BrL2dpaGRDY2RKL0tDcDdIN2J5MlRJbDZwdXNUam1wUDJ0SUdrYS9VNndoSUR6SjE2NTZ4Q2g4NnprT050Q21rQUY2VXhZQko5Sy9wekpvbTNMNjRuSlB5OTExMFNpZUQrdkJKSWxUUU5CSDlldHlFL0dpQXc', 'png-alpha'],
  'macbook-neo': ['mac-card-40-macbook-neo-202603', 'dzRRdVl2UHpmd3BrL2dpaGRDY2RKOFVIc0pMamhtQTdJT2hNaXc2a1F5UWw2T29GWFRmcGlRaHRKa2ZZeG54SDAzOVFHb3N0MkVmS01ZcFh0d1Y4R3VJQzFFSW1tTHpVQytuM3E0QnJqcFk', 'png-alpha'],
  'imac': ['mac-card-40-imac-202410', 'SXh2aE4zRm53L0l3NnhGK2wwZFpEeVFpZGxOY0d3emNHMmh4SnZVS1l0RDdRNkRHT1AraVB3dDYzaU9taHdyNi81YzM5dnY2ZG8yaWNpai9qbmUreldGQVBsa1FFVkZpYlRSVlN0YVJXWU0', 'png-alpha'],

  'ipad-pro': ['ipad-card-40-pro-202405', 'aDFmUE8yL0ZIcG1CVlF3ejZoSTBUbTF4V1ZRMnQ3VUZxOW9XbE84blhkazJzUm9kdjFCbFNETWhUL0NFUjdrYUVnTTR0dy9GMG1wdkgrK3EyQ1ZzOVk5emI2RVlYSVRkMzZLOS9VQVhQeWM', 'p-jpg'],
  'ipad-air': ['ipad-card-40-air-202405', 'U0psRWR6Z2xkY3dwRTZYSCtyQXNFVzF4V1ZRMnQ3VUZxOW9XbE84blhkazJzUm9kdjFCbFNETWhUL0NFUjdrYUVnTTR0dy9GMG1wdkgrK3EyQ1ZzOWE5aFE4VmtCSkdBUVZYOWx3MEhPK1E', 'p-jpg'],
  'ipad': ['ipad-card-40-ipad-202410', 'SFZodklRUStGeVJpUE9iYTA5SFFYbGwrSnJIWjJhMUN2SjF6Kysvd1dxdzgycjlDNGdlREhyeERCVjM1SXkycmorTlFRdUE1QXhRRzN4cmdvU2JhR29CQ1VSdXF0eklXUlZzZ1YxYUU2TWc', 'p-jpg'],
  'ipad-mini': ['ipad-card-40-ipad-mini-202410', 'SFZodklRUStGeVJpUE9iYTA5SFFYckRXSmo5UmJSVFZrL2VnaTRyQWlQYkRiOENhazh5Y0NacmRZMFN0dVNvZzJTaS9RTTYzTWg5VUhTM1Ara0JyS1BaU2ZtcjFuMTU2NDJ5KzgwcGVpcEU', 'p-jpg'],

  'watch-s11': ['watch-card-40-s11-202509_GEO_US', 'RGt6QnVpU0piVDZnRHZnWmNNbHB2N1kwNlR4L1oxcmNLdEMxb09HZ1RqYTJjSW42RjNkUmxsaVhqRzVyUDdYaTE1UUxLT2t0cW42N3FvQzVqaGhrVVM3ZXVHSjh6dHVIQnNuWHRNL1lHcFYrYWpGdS9XeFgvbS9ITnNYOEhYaG4', 'jpeg'],
  'watch-se': ['watch-card-40-se-202603', 'dFQyNjEycitpbFBFNXA5RHpaQjc1dmtmTUxrN0k3bXk5Rkc5ZUE1R0JqZzJzUm9kdjFCbFNETWhUL0NFUjdrYWpXMmN1SUZuRTA3ZHE2K3NlL08vSGIxL2Q2OVdrdU5zSjVnbHRXUEVDNVk', 'p-jpg'],
  'watch-ultra': ['watch-card-40-ultra3-202509_GEO_US', 'Yldjd2t3Ymo3YVZBc2hwblI4VFkzckh2d2I2QWRTY0NRMFJRd2UzeExSczBUZG9jeU40eXVpQXBKTXpRY2Q4dVhHUkcvNmtpMGxDZTE1ejhaNlcyMHp1MnZVNkVGSEJOV2tCeXV3UExBSWY1R0pqQXNoaUNETnNuWkgwY0hpcFg', 'p-jpg'],

  'airpods-pro': ['airpods-alp-curatedgrid-airpodpro-small', 'cmJ2cjY0dlR6NEhFdDdMYUtQbUVPL2RLTkpPempvSTdmbHhUeWF4c1JLaHJBYTNISGZWUFlURUlNU2NzeXcyczM0NGtSOE5kUlFFRFVPVURDTHRsQlA3OWN4dnlFZGJ0eDZwT1ozRGdXZkZJa1FXeG5xbUs0Q1FDckJKR013VUI', 'p-jpg'],
  'airpods-4-anc': ['airpods-4-anc-select-202409', 'Qklmb1JJend3cVIxSUxIeFBIRk96bThJMURFZUhTTm9tejgvK2t1SGM0aTNBTitXcXllSm03MitZU1RxZkdKdnVUb3VPa2FUZVhQMFhDQnVBMWhwQStIS1N0Y2toYVRyOXJzOXFaZS9qdVU', 'jpeg'],
  'airpods-4': ['airpods-4-select-202409', 'WnVKRVRUTFVsYThXaWkydWViL1Q3YVNPdnNtOGZTWlh1SngwMDB6OE1wOVl4VTEwRFRaQWJtZFBDclczSnk1K011Vkx0d3RESTNhdkY1OFVjS3pqU0xwV0tlQzF6RklkcnZBd1ZLRlhhT28', 'jpeg'],
  'airpods-max': ['airpods-max-select-202409-midnight', 'azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyeXFURzlLUCtjbnpPOTNaLzZjUEdiQjc2ZEU5NXBoZDgxbjhNMm1RTkk2UTE1OEFsVER3czdPdmZMZm5lc1BRWjM3RmpVbSsySTQ2Nm5jdG9qeUpuUkw', 'jpeg'],

  'apple-tv': ['store-card-13-appletv-nav-202210', 'T0wvM1N3YUcxQ09qK0VNRkl1RU1BZFM5WnN0RmVZRmVXQ0FCUWJjbnJDald1aTN5QlRYNG5PRjJxc2d1RklXbVM0TjRWdzF2UjRGVEY0c3dBQVZ6VFZ3YmJrVi9SakQxWUcrYWQwVXc5VTA', 'png-alpha'],
  'homepod-mini': ['store-card-13-homepod-nav-202301', 'WVcvamRucHVMMWs5SXZ3bVJ3Q2hpZGR0czFXNWdCUW14eTN2U29pLzNMcld1aTN5QlRYNG5PRjJxc2d1RklXbVM0TjRWdzF2UjRGVEY0c3dBQVZ6VFJmbWU0TjJLamxsdTltNkZVZ1RhbDA', 'png-alpha'],
  'vision-pro': ['store-card-13-vision-pro-nav-202401', 'VzVpanYvTldHb05iVXFhc0xveWRLM25jd0w4dXFwc1hFbWZkNm9IcUR2bytSMWt1ZUNyTGx4SjRKL1pSL0ZDeGpCeVFkSWhuN0RJazJDeHBqaFFac0hlZzcwajlwb1R2dHNlazl1dldSUGQ5RzBLTDk5c25YRG5wR2ZpUlI4RFM', 'png-alpha'],
  'airtag-4pack': ['store-card-13-airtags-nav-202601', 'Q0Z1bWFqMUpRRnp3T0Y0VWJpdk1yL1FqZ2pobDV2bDUyWU1XVmNnMmx3VFd1aTN5QlRYNG5PRjJxc2d1RklXbVM0TjRWdzF2UjRGVEY0c3dBQVZ6VFg3OVE4VE5ic3VkUXEzS3pERTg2am8', 'png-alpha'],
  'airtag': ['store-card-13-airtags-nav-202601', 'Q0Z1bWFqMUpRRnp3T0Y0VWJpdk1yL1FqZ2pobDV2bDUyWU1XVmNnMmx3VFd1aTN5QlRYNG5PRjJxc2d1RklXbVM0TjRWdzF2UjRGVEY0c3dBQVZ6VFg3OVE4VE5ic3VkUXEzS3pERTg2am8', 'png-alpha'],
  'magsafe': ['store-card-13-accessories-nav-202603', 'QnhsNk96S0o4R1dkN2FveStNM1hwNzZGMHVrNGw2NTM5Vmk2bHZzMXQ3aUlac2ROMkdFNG0rMXdMQ0t2WTVlSFBrcjVFNVdueFRVbVY3TGtiL2RjUWVXQ0tWTWFGNXA2NmlzMmRVQ1l6WmlFMHVWQmxPTEFhTVNvVStGSjlxajM', 'png-alpha'],
  'adapter-20w': ['store-card-13-accessories-nav-202603', 'QnhsNk96S0o4R1dkN2FveStNM1hwNzZGMHVrNGw2NTM5Vmk2bHZzMXQ3aUlac2ROMkdFNG0rMXdMQ0t2WTVlSFBrcjVFNVdueFRVbVY3TGtiL2RjUWVXQ0tWTWFGNXA2NmlzMmRVQ1l6WmlFMHVWQmxPTEFhTVNvVStGSjlxajM', 'png-alpha'],
  'usbc-cable': ['store-card-13-accessories-nav-202603', 'QnhsNk96S0o4R1dkN2FveStNM1hwNzZGMHVrNGw2NTM5Vmk2bHZzMXQ3aUlac2ROMkdFNG0rMXdMQ0t2WTVlSFBrcjVFNVdueFRVbVY3TGtiL2RjUWVXQ0tWTWFGNXA2NmlzMmRVQ1l6WmlFMHVWQmxPTEFhTVNvVStGSjlxajM', 'png-alpha'],
};

const url = (id, v, fmt) =>
  `${CDN}${id}?wid=900&hei=900&fmt=${fmt}${fmt === 'p-jpg' || fmt === 'jpeg' ? '&qlt=90' : ''}&.v=${v}`;

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

async function haveCwebp() {
  try { await execFileAsync('cwebp', ['-version']); return true; } catch { return false; }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const useWebp = checkOnly ? false : await haveCwebp();
  if (!checkOnly) {
    console.log(useWebp
      ? 'cwebp found — images will be converted to .webp\n'
      : 'cwebp not found — keeping original format (install webp for smaller files)\n');
  }

  const entries = Object.entries(IMAGES);
  const done = [];
  let failed = 0;

  for (const [slug, [id, v, fmt]] of entries) {
    const src = url(id, v, fmt);
    process.stdout.write(`${slug.padEnd(20)} `);
    try {
      const res = await fetch(src, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length}B)`);

      if (checkOnly) { console.log(`OK  ${(buf.length / 1024).toFixed(0)}KB (not saved)`); done.push(slug); continue; }

      const ext = fmt === 'png-alpha' ? 'png' : 'jpg';
      const raw = path.join(OUT, `${slug}.${ext}`);
      await writeFile(raw, buf);

      let finalName = `${slug}.${ext}`;
      if (useWebp) {
        const webp = path.join(OUT, `${slug}.webp`);
        await execFileAsync('cwebp', ['-quiet', '-q', '82', raw, '-o', webp]);
        await rm(raw, { force: true });
        finalName = `${slug}.webp`;
      }
      done.push({ slug, finalName });
      console.log(`OK  -> ${finalName}`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${err.message}`);
    }
  }

  if (checkOnly) {
    console.log(`\n${done.length}/${entries.length} reachable.`);
    return;
  }

  // Repoint index.html at whatever extension we actually wrote.
  const indexPath = path.join(ROOT, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  let rewrites = 0;
  for (const item of done) {
    if (typeof item === 'string') continue;
    const { slug, finalName } = item;
    for (const oldExt of ['svg', 'webp', 'png', 'jpg']) {
      const from = `assets/products/${slug}.${oldExt}`;
      if (from.endsWith(finalName)) continue;
      if (html.includes(from)) {
        html = html.split(from).join(`assets/products/${finalName}`);
        rewrites++;
      }
    }
  }
  await writeFile(indexPath, html);

  // Drop placeholder files that are now superseded.
  for (const item of done) {
    if (typeof item === 'string') continue;
    const { slug, finalName } = item;
    for (const ext of ['svg', 'webp', 'png', 'jpg']) {
      const p = path.join(OUT, `${slug}.${ext}`);
      if (path.basename(p) !== finalName && existsSync(p)) await rm(p, { force: true });
    }
  }

  console.log(`\nDownloaded ${entries.length - failed}/${entries.length}. index.html updated (${rewrites} path rewrites).`);
  if (failed) console.log(`${failed} failed — those keep their placeholder artwork.`);
  console.log('\nReview, then: git add -A && git commit -m "Use official Apple product imagery" && git push');
}

main().catch((e) => { console.error(e); process.exit(1); });
