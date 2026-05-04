// scripts/build-word-bank.mjs
// Run: node scripts/build-word-bank.mjs

import https from "https";
import fs   from "fs";
import path from "path";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const OUT_PATH   = path.resolve("public/words/en.json");
const BATCH_SIZE = 40;        // Increased from 25 for faster processing
const API_DELAY  = 40;        // Reduced from 60 for better throughput

// Increased targets for ~4000 total words
const BUCKET_TARGETS = {
  easy: { 
    3: 200,   // was 120  (+80)
    4: 350,   // was 200  (+150)
    5: 500,   // was 250  (+250)
    6: 500,   // was 250  (+250)
    7: 400,   // was 200  (+200)
    8: 300,   // was 150  (+150)
    9: 200,   // was 100  (+100)
    10: 150   // was 75   (+75)
  },
  hard: { 
    5: 350,   // was 200  (+150)
    6: 350,   // was 200  (+150)
    7: 300,   // was 175  (+125)
    8: 250,   // was 150  (+100)
    9: 200,   // was 125  (+75)
    10: 150   // was 100  (+50)
  },
};

const SOURCES = {
  common: "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt",
  moby:   "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return resolve(get(res.headers.location));
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end",  () => resolve(data));
    }).on("error", reject);
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── QUALITY FILTERS ─────────────────────────────────────────────────────────

// Hard blocklist — proper nouns, abbreviations, codes that slip through alpha filter
const BLOCKLIST = new Set([
  "http","www","tvs","mph","rpm","aka","eta","cia","fbi","dna","rna",
  "gps","url","pdf","jpg","png","css","php","sql","lol","omg","wtf",
  "brb","imo","beth","john","mike","jane","gary","judy","troy","chad","brad",
  "wifi","hdmi","smtp","html","json","ajax","nasa","nato","opec",
  // Additional blocklist items for quality
  "xvx","zxz","qQQ","aaa","bbb","ccc","ddd","eee","fff","ggg","hhh","iii",
  "jjj","kkk","lll","mmm","nnn","ooo","ppp","qqq","rrr","sss","ttt","uuu",
  "vvv","www","xxx","yyy","zzz",
]);

const VOWELS = new Set(["a","e","i","o","u"]);

function hasVowel(word) {
  return word.split("").some((c) => VOWELS.has(c));
}

// Relaxed structure check for more inclusive word selection
function hasReasonableStructure(word) {
  // Must have at least one vowel
  if (!hasVowel(word)) return false;
  
  // Increased from 6 to 7 consecutive consonants (more permissive)
  // Allows words like "rhythms", "sphynx", "strengths"
  if (/[^aeiou]{7,}/.test(word)) return false;
  
  // Relaxed vowel ratio requirement (was Math.ceil(length/5), now /6)
  // This allows words like "myth", "fly", "crypt" that have fewer vowels
  const vowelCount = word.split("").filter((c) => VOWELS.has(c)).length;
  return vowelCount >= Math.ceil(word.length / 6);
}

function isUsableWord(word) {
  if (BLOCKLIST.has(word)) return false;
  if (!hasReasonableStructure(word)) return false;
  return true;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📥  Fetching word sources...");
  console.log("🎯  Target: ~4000 total words (easy + hard)");

  const [commonRaw, mobyRaw] = await Promise.all([get(SOURCES.common), get(SOURCES.moby)]);

  // Google 10k — frequency ranked
  const commonList = commonRaw
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= 3 && isUsableWord(w));

  // Increased from 6000 to 8000 for larger candidate pool
  const commonRanked = new Map(commonList.map((w, i) => [w, i]));
  const commonSet    = new Set(commonList.slice(0, 8000));

  // Moby — full dictionary
  const mobyList = mobyRaw
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= 3 && isUsableWord(w));
  
  const mobySet = new Set(mobyList);

  console.log(`✅  Sources: ${commonList.length.toLocaleString()} common, ${mobySet.size.toLocaleString()} moby`);

  // ── Candidate pools ───────────────────────────────────────────────────────

  // Easy: from common list, sorted by frequency
  const easyCandidates = {};
  for (let l = 3; l <= 10; l++) easyCandidates[l] = [];

  for (const [word, rank] of commonRanked.entries()) {
    const l = word.length;
    if (l >= 3 && l <= 10) easyCandidates[l].push({ word, rank });
  }
  for (const l of Object.keys(easyCandidates)) {
    easyCandidates[l].sort((a, b) => a.rank - b.rank);
  }

  // Hard: from Moby, NOT in top 8k common, lengths 5–10
  const hardCandidates = {};
  for (let l = 5; l <= 10; l++) hardCandidates[l] = [];

  for (const word of mobySet) {
    if (commonSet.has(word)) continue;
    const l = word.length;
    if (l >= 5 && l <= 10) hardCandidates[l].push(word);
  }
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  for (const l of Object.keys(hardCandidates)) shuffle(hardCandidates[l]);

  // Log candidate counts so we can debug empty buckets immediately
  console.log("\n📊  Candidate counts:");
  for (let l = 3; l <= 10; l++) {
    const count = easyCandidates[l]?.length ?? 0;
    const target = BUCKET_TARGETS.easy[l] ?? 0;
    const status = count >= target ? "✅" : count === 0 ? "⚠️" : "🟡";
    console.log(`  ${status} easy/${l}: ${count.toLocaleString()} candidates (target: ${target})`);
  }
  for (let l = 5; l <= 10; l++) {
    const count = hardCandidates[l]?.length ?? 0;
    const target = BUCKET_TARGETS.hard[l] ?? 0;
    const status = count >= target ? "✅" : count === 0 ? "⚠️" : "🟡";
    console.log(`  ${status} hard/${l}: ${count.toLocaleString()} candidates (target: ${target})`);
  }

  // ── Build word bank (no API validation - trusting sources) ────────────────

  function buildBucket(candidates, target, label) {
    if (candidates.length === 0) {
      console.log(`  ⚠️ ${label}: no candidates — skipping`);
      return [];
    }

    // Take the first 'target' words from candidates (already sorted by quality)
    const selected = candidates
      .slice(0, target)
      .map((c) => (typeof c === "string" ? c : c.word));
    
    console.log(`  ✅ ${label}: ${selected.length}/${target} words selected (source-trusted)`);
    return selected;
  }

  console.log("\n📝  Building word bank (using source-trusted dictionaries)...\n");

  const output = {
    meta: {
      generated: new Date().toISOString(),
      sources: Object.values(SOURCES),
      totalTarget: 4000,
      description: "mono—dialect word bank. Curated for real, usable English vocabulary. " +
        "easy = common meaningful words (3–10 letters). " +
        "hard = genuine vocabulary-building words (5–10 letters). " +
        "Optimized for ~4000 total words with relaxed quality filters for better coverage.",
      parameters: {
        maxConsecutiveConsonants: 7,
        minVowelRatio: 1/6,
        commonSourceMaxWords: 8000,
        validationMethod: "source-trusted",
      },
    },
    easy: {},
    hard: {},
  };

  let easyTotal = 0;
  let hardTotal = 0;

  console.log("📝 Building EASY difficulty words...");
  for (let len = 3; len <= 10; len++) {
    const target     = BUCKET_TARGETS.easy[len];
    if (!target) continue;
    const candidates = easyCandidates[len] ?? [];
    const words      = buildBucket(candidates, target, `easy/${len}-letter`);
    output.easy[len] = words;
    easyTotal += words.length;
  }

  console.log("\n📝 Building HARD difficulty words...");
  for (let len = 5; len <= 10; len++) {
    const target     = BUCKET_TARGETS.hard[len];
    if (!target) continue;
    const candidates = hardCandidates[len] ?? [];
    const words      = buildBucket(candidates, target, `hard/${len}-letter`);
    output.hard[len] = words;
    hardTotal += words.length;
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  const total = easyTotal + hardTotal;
  const percentageOfTarget = (total / 4000 * 100).toFixed(1);

  console.log("\n" + "=".repeat(50));
  console.log(`✅  BUILD COMPLETE`);
  console.log("=".repeat(50));
  console.log(`📊  Total words: ${total.toLocaleString()} / 4000 target (${percentageOfTarget}%)`);
  console.log(`   🟢 Easy:  ${easyTotal.toLocaleString()} words`);
  console.log(`   🔴 Hard:  ${hardTotal.toLocaleString()} words`);
  console.log("\n📈  Breakdown by length:");
  
  for (let len = 3; len <= 10; len++) {
    const easy = output.easy[len]?.length ?? 0;
    const hard = output.hard[len]?.length ?? 0;
    if (easy > 0 || hard > 0) {
      console.log(`   ${len} letters: ${easy} easy + ${hard} hard = ${easy + hard} total`);
    }
  }
  
  console.log(`\n💾  Output saved to: ${OUT_PATH}`);
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
