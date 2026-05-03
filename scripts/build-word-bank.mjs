// scripts/build-word-bank.mjs
// Run: node scripts/build-word-bank.mjs
//
// Sources:
//   1. MIT 10k common English words (dwyl/english-words)
//   2. Spell-checker SCOWL word list via freedict
//   3. Validates each candidate against Free Dictionary API
//
// Output: public/words/en.json

import https from "https";
import fs   from "fs";
import path from "path";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const OUT_PATH   = path.resolve("public/words/en.json");
const BATCH_SIZE = 25;   // increased from 10
const API_DELAY  = 60;   // ms between batches, decreased from 120

// Per-bucket targets — smaller for longer words since fewer exist cleanly
const BUCKET_TARGETS = {
  3:  600,
  4:  600,
  5:  600,
  6:  600,
  7:  400,
  8:  300,
  9:  200,
  10: 150,
};

// ─── SOURCES ─────────────────────────────────────────────────────────────────

const SOURCES = [
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt",
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
      resolve(res.statusCode === 200);
      res.resume();
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

  const commonList = commonRaw
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w));

  const fullSet = new Set(
    fullRaw
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => /^[a-z]+$/.test(w))
  );

  const commonSet = new Set(commonList.slice(0, 5000));

  console.log(`✅  Sources loaded: ${commonList.length} common, ${fullSet.size} full`);

  // ── Build candidate pools ─────────────────────────────────────────────────

  // Easy: lengths 3–10 from common list
  const easyByLen = {};
  for (let l = 3; l <= 10; l++) easyByLen[l] = [];
  for (const w of commonList) {
    const l = w.length;
    if (l >= 3 && l <= 10) easyByLen[l].push(w);
  }

  // Hard: lengths 5–10, words NOT in top-5k
  const hardByLen = {};
  for (let l = 5; l <= 10; l++) hardByLen[l] = [];
  for (const w of fullSet) {
    if (commonSet.has(w)) continue;
    const l = w.length;
    if (l >= 5 && l <= 10) hardByLen[l].push(w);
  }

  // Shuffle to avoid alphabetical bias
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  for (const k of Object.keys(easyByLen)) shuffle(easyByLen[k]);
  for (const k of Object.keys(hardByLen)) shuffle(hardByLen[k]);

  // ── Validate ──────────────────────────────────────────────────────────────

  async function buildBucket(candidates, target, label) {
    const validated = [];
    let i = 0;
    process.stdout.write(`  Validating ${label}: 0/${target}`);

    while (validated.length < target && i < candidates.length) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const good  = await validateBatch(batch);
      validated.push(...good);
      i += BATCH_SIZE;
      process.stdout.write(
        `\r  Validating ${label}: ${Math.min(validated.length, target)}/${target}`
      );
      await sleep(API_DELAY);
    }

    process.stdout.write("\n");
    return validated.slice(0, target);
  }

  console.log("\n🔍  Validating words...\n");

  const output = {
    meta: {
      generated: new Date().toISOString(),
      sources: SOURCES,
      description:
        "mono—dialect word bank. easy = common words (3–10 letters). hard = uncommon words (5–10 letters).",
    },
    easy: {},
    hard: {},
  };

  // Easy buckets 3–10
  for (let len = 3; len <= 10; len++) {
    const target    = BUCKET_TARGETS[len];
    const candidates = easyByLen[len] ?? [];
    const words     = await buildBucket(candidates, target, `easy/${len}-letter`);
    output.easy[len] = words;
    console.log(`  ✔ easy/${len}: ${words.length} words`);
  }

  // Hard buckets 5–10
  for (let len = 5; len <= 10; len++) {
    const target    = BUCKET_TARGETS[len];
    const candidates = hardByLen[len] ?? [];
    const words     = await buildBucket(candidates, target, `hard/${len}-letter`);
    output.hard[len] = words;
    console.log(`  ✔ hard/${len}: ${words.length} words`);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

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
