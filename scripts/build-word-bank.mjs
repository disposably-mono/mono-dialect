// scripts/build-word-bank.mjs
// Run: node scripts/build-word-bank.mjs
//
// Sources:
//   1. MIT 10k common English words (dwyl/english-words)
//   2. Spell-checker SCOWL word list via freedict
//   3. Validates each candidate against Free Dictionary API
//      (same API the game uses — guarantees all words are lookupable)
//
// Output: public/words/en.json

import https from "https";
import fs   from "fs";
import path from "path";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const OUT_PATH   = path.resolve("public/words/en.json");
const BATCH_SIZE = 10;        // concurrent dictionary API calls
const API_DELAY  = 120;       // ms between batches (be polite to the free API)

// How many words to validate per (length, tier) bucket.
// Higher = richer word bank, slower script. Adjust freely.
const BUCKET_TARGETS = {
  common: 600,   // top ~10k frequency words (Easy pool)
  uncommon: 400, // words outside top 5k (Hard pool)
};

// ─── SOURCES ─────────────────────────────────────────────────────────────────

const SOURCES = [
  // dwyl 10k most common English words — plain newline-separated
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt",
  // SCOWL medium — broader vocabulary for Hard pool candidates
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(get(res.headers.location));
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function validateWord(word) {
  return new Promise((resolve) => {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    https.get(url, (res) => {
      // 200 = valid English word in dictionary
      resolve(res.statusCode === 200);
      res.resume(); // drain
    }).on("error", () => resolve(false));
  });
}

async function validateBatch(words) {
  const results = await Promise.all(words.map(validateWord));
  return words.filter((_, i) => results[i]);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📥  Fetching word sources...");

  const [commonRaw, fullRaw] = await Promise.all(SOURCES.map(get));

  // Source 1: google-10000 — these are frequency-ranked (index 0 = most common)
  const commonList = commonRaw
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w));

  // Source 2: words_alpha — full dictionary, used for uncommon candidates
  const fullSet = new Set(
    fullRaw
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => /^[a-z]+$/.test(w))
  );

  const commonSet = new Set(commonList.slice(0, 5000)); // top 5k = "common"

  console.log(`✅  Sources loaded: ${commonList.length} common, ${fullSet.size} full`);

  // ── Build candidate pools by length ──────────────────────────────────────

  // Easy pool: words in top-10k list, lengths 3–6
  const easyByLen = { 3: [], 4: [], 5: [], 6: [] };
  for (const w of commonList) {
    const l = w.length;
    if (l >= 3 && l <= 6 && easyByLen[l]) easyByLen[l].push(w);
  }

  // Hard pool: words NOT in top-5k, lengths 5–7
  const hardByLen = { 5: [], 6: [], 7: [] };
  for (const w of fullSet) {
    if (commonSet.has(w)) continue; // skip common words
    const l = w.length;
    if (l >= 5 && l <= 7 && hardByLen[l]) hardByLen[l].push(w);
  }

  // Shuffle so we don't always validate alphabetical runs
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  for (const k of Object.keys(easyByLen)) shuffle(easyByLen[k]);
  for (const k of Object.keys(hardByLen)) shuffle(hardByLen[k]);

  // ── Validate candidates via Free Dictionary API ───────────────────────────

  async function buildBucket(candidates, target, label) {
    const validated = [];
    let i = 0;
    process.stdout.write(`  Validating ${label}: 0/${target}`);

    while (validated.length < target && i < candidates.length) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const good  = await validateBatch(batch);
      validated.push(...good);
      i += BATCH_SIZE;
      process.stdout.write(`\r  Validating ${label}: ${Math.min(validated.length, target)}/${target}`);
      await sleep(API_DELAY);
    }

    process.stdout.write("\n");
    return validated.slice(0, target);
  }

  console.log("\n🔍  Validating words (this takes a few minutes)...\n");

  const output = {
    meta: {
      generated: new Date().toISOString(),
      sources: SOURCES,
      description: "mono—dialect word bank. easy = common words (3-6 letters). hard = uncommon words (5-7 letters).",
    },
    easy: {},
    hard: {},
  };

  // Easy buckets
  for (const [len, candidates] of Object.entries(easyByLen)) {
    const target = BUCKET_TARGETS.common;
    const words  = await buildBucket(candidates, target, `easy/${len}-letter`);
    output.easy[len] = words;
    console.log(`  ✔ easy/${len}: ${words.length} words`);
  }

  // Hard buckets
  for (const [len, candidates] of Object.entries(hardByLen)) {
    const target = BUCKET_TARGETS.uncommon;
    const words  = await buildBucket(candidates, target, `hard/${len}-letter`);
    output.hard[len] = words;
    console.log(`  ✔ hard/${len}: ${words.length} words`);
  }

  // ── Write output ──────────────────────────────────────────────────────────

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  const totalWords = [
    ...Object.values(output.easy),
    ...Object.values(output.hard),
  ].reduce((sum, arr) => sum + arr.length, 0);

  console.log(`\n✅  Done. ${totalWords} words written to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
