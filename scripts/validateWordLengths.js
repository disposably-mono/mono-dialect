#!/usr/bin/env node

/**
 * Word Length Validator for mono-dialect word bank
 * 
 * Usage:
 *   node scripts/validateWordLengths.js
 *   node scripts/validateWordLengths.js --fix    (removes/moves mismatched words)
 *   node scripts/validateWordLengths.js --verbose
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WORD_BANK_PATH = path.join(process.cwd(), 'public', 'words', 'en.json');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const FIX = process.argv.includes('--fix') || process.argv.includes('-f');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readWordBank() {
  try {
    const data = fs.readFileSync(WORD_BANK_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    log(`❌ Error reading file: ${error.message}`, 'red');
    process.exit(1);
  }
}

function writeWordBank(data, fixCountTotal) {
  try {
    fs.writeFileSync(WORD_BANK_PATH, JSON.stringify(data, null, 2), 'utf-8');
    log(`✅ Fixed ${fixCountTotal} issue(s) and saved to ${WORD_BANK_PATH}`, 'green');
  } catch (error) {
    log(`❌ Error writing file: ${error.message}`, 'red');
    process.exit(1);
  }
}

function validateDifficulty(difficulty, difficultyKey) {
  const issues = [];
  let fixCount = 0;
  let removedCount = 0;

  // Get all valid length keys (as numbers) that exist in this difficulty
  const existingLengths = new Set(
    Object.keys(difficulty)
      .map(k => parseInt(k, 10))
      .filter(k => !isNaN(k))
  );

  for (const [lengthKey, words] of Object.entries(difficulty)) {
    const expectedLength = parseInt(lengthKey, 10);
    
    if (isNaN(expectedLength)) {
      log(`  ⚠️  Invalid length key: "${lengthKey}"`, 'yellow');
      continue;
    }

    if (!Array.isArray(words)) {
      issues.push({
        type: 'not_array',
        difficulty: difficultyKey,
        length: lengthKey,
        message: `Value for length ${lengthKey} is not an array`,
      });
      continue;
    }

    // Process each word - we need to iterate backwards when removing
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      
      if (typeof word !== 'string') {
        issues.push({
          type: 'not_string',
          difficulty: difficultyKey,
          length: lengthKey,
          word: String(word),
          message: `Non-string value removed: ${String(word)}`,
        });
        words.splice(i, 1);
        removedCount++;
        fixCount++;
        continue;
      }

      const actualLength = word.length;
      
      if (actualLength !== expectedLength) {
        issues.push({
          type: 'length_mismatch',
          difficulty: difficultyKey,
          length: lengthKey,
          word: word,
          actualLength: actualLength,
          expectedLength: expectedLength,
          message: `"${word}" has length ${actualLength}, expected ${expectedLength}`,
        });
        
        if (FIX) {
          const correctKey = String(actualLength);
          
          // Check if the correct length key exists in this difficulty
          if (difficulty[correctKey] && Array.isArray(difficulty[correctKey])) {
            // Move to correct location
            words.splice(i, 1);
            difficulty[correctKey].push(word);
            fixCount++;
            if (VERBOSE) {
              log(`    📦 Moved "${word}" from ${lengthKey} → ${correctKey}`, 'green');
            }
          } else {
            // Correct key doesn't exist - remove the word
            words.splice(i, 1);
            removedCount++;
            fixCount++;
            if (VERBOSE) {
              log(`    🗑️  Removed "${word}" (length ${actualLength}) - key ${correctKey} doesn't exist in ${difficultyKey}`, 'yellow');
            }
          }
        }
      }
    }
  }
  
  // Check for duplicate words within the same length (after fixes)
  for (const [lengthKey, words] of Object.entries(difficulty)) {
    if (!Array.isArray(words)) continue;
    
    const seen = new Set();
    const duplicates = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (seen.has(word)) {
        duplicates.push({ word, index: i });
      } else {
        seen.add(word);
      }
    }
    
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate',
        difficulty: difficultyKey,
        length: lengthKey,
        duplicates: duplicates,
        message: `${duplicates.length} duplicate word(s) found: ${duplicates.map(d => d.word).join(', ')}`,
      });
      
      if (FIX) {
        const unique = [...new Set(words)];
        const removed = words.length - unique.length;
        difficulty[lengthKey] = unique;
        fixCount += removed;
        if (VERBOSE && removed > 0) {
          log(`    🔄 Removed ${removed} duplicate(s) from ${difficultyKey}[${lengthKey}]`, 'green');
        }
      }
    }
  }
  
  // Remove empty arrays (optional cleanup)
  if (FIX) {
    for (const [lengthKey, words] of Object.entries(difficulty)) {
      if (Array.isArray(words) && words.length === 0) {
        delete difficulty[lengthKey];
        if (VERBOSE) {
          log(`    🧹 Removed empty key: ${lengthKey} from ${difficultyKey}`, 'gray');
        }
      }
    }
  }
  
  return { issues, fixCount, removedCount };
}

function validateCrossDifficultyDuplicates(wordBank) {
  const issues = [];
  let fixCount = 0;
  
  for (const lengthKey of Object.keys(wordBank.easy)) {
    const easyWords = new Set(wordBank.easy[lengthKey] || []);
    const hardWords = wordBank.hard[lengthKey] || [];
    
    for (let i = 0; i < hardWords.length; i++) {
      const hardWord = hardWords[i];
      if (easyWords.has(hardWord)) {
        issues.push({
          type: 'cross_difficulty_duplicate',
          length: lengthKey,
          word: hardWord,
          message: `"${hardWord}" appears in both easy and hard (length ${lengthKey})`,
        });
        
        if (FIX) {
          // Remove from hard (keep in easy since it's common word)
          hardWords.splice(i, 1);
          i--;
          fixCount++;
          if (VERBOSE) {
            log(`    🔄 Removed "${hardWord}" from hard (kept in easy)`, 'green');
          }
        }
      }
    }
  }
  
  return { issues, fixCount };
}

function validateNoSpacesOrPunctuation(wordBank) {
  const issues = [];
  let fixCount = 0;
  const pattern = /^[a-z]+$/;
  
  for (const difficulty of ['easy', 'hard']) {
    for (const [lengthKey, words] of Object.entries(wordBank[difficulty])) {
      if (!Array.isArray(words)) continue;
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        if (typeof word === 'string' && !pattern.test(word)) {
          issues.push({
            type: 'invalid_characters',
            difficulty: difficulty,
            length: lengthKey,
            word: word,
            message: `"${word}" contains non-letter characters (removed)`,
          });
          
          if (FIX) {
            words.splice(i, 1);
            fixCount++;
            if (VERBOSE) {
              log(`    🗑️  Removed invalid word: "${word}"`, 'yellow');
            }
          }
        }
      }
    }
  }
  
  return { issues, fixCount };
}

function validateUppercase(wordBank) {
  const issues = [];
  let fixCount = 0;
  
  for (const difficulty of ['easy', 'hard']) {
    for (const [lengthKey, words] of Object.entries(wordBank[difficulty])) {
      if (!Array.isArray(words)) continue;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (typeof word === 'string' && word !== word.toLowerCase()) {
          issues.push({
            type: 'not_lowercase',
            difficulty: difficulty,
            length: lengthKey,
            word: word,
            message: `"${word}" should be lowercase (fixed)`,
          });
          
          if (FIX) {
            words[i] = word.toLowerCase();
            fixCount++;
          }
        }
      }
    }
  }
  
  return { issues, fixCount };
}

function printSummary(stats) {
  log('\n' + '═'.repeat(60), 'cyan');
  log('VALIDATION SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n📁 File: ${WORD_BANK_PATH}`, 'blue');
  log(`📊 Total words: ${stats.totalWords.toLocaleString()}`, 'blue');
  log(`🎯 Easy words: ${stats.easyWords.toLocaleString()}`, 'green');
  log(`🔥 Hard words: ${stats.hardWords.toLocaleString()}`, 'yellow');
  
  if (stats.totalIssues === 0) {
    log('\n✅ All valid! No issues found.', 'green');
  } else {
    log(`\n❌ Found ${stats.totalIssues} issue(s):`, 'red');
    
    for (const [type, count] of Object.entries(stats.issueBreakdown)) {
      if (count > 0) {
        log(`  • ${type}: ${count}`, 'red');
      }
    }
    
    if (stats.removedCount > 0) {
      log(`\n🗑️  Removed ${stats.removedCount} word(s) (invalid or missing target keys)`, 'yellow');
    }
    
    if (stats.movedCount > 0) {
      log(`📦 Moved ${stats.movedCount} word(s) to correct length keys`, 'green');
    }
    
    if (stats.fixedCount > 0) {
      log(`🔧 Auto-fixed ${stats.fixedCount} issue(s) total`, 'green');
    }
  }
  
  log('');
}

function main() {
  log('\n🔍 Validating word bank lengths...\n', 'cyan');
  
  const wordBank = readWordBank();
  
  // Validate meta exists
  if (!wordBank.meta) {
    log('⚠️  Warning: No "meta" field found in word bank', 'yellow');
  }
  
  let totalIssues = 0;
  let totalFixCount = 0;
  let totalRemovedCount = 0;
  let totalMovedCount = 0;
  const issueBreakdown = {
    length_mismatch: 0,
    duplicate: 0,
    cross_difficulty_duplicate: 0,
    invalid_characters: 0,
    not_lowercase: 0,
    not_array: 0,
    not_string: 0,
  };
  
  let totalWords = 0;
  let easyWords = 0;
  let hardWords = 0;
  
  // Validate easy difficulty
  log('📖 Checking "easy" difficulty...', 'green');
  const easyResult = validateDifficulty(wordBank.easy, 'easy');
  totalIssues += easyResult.issues.length;
  totalFixCount += easyResult.fixCount;
  totalRemovedCount += easyResult.removedCount || 0;
  
  for (const issue of easyResult.issues) {
    issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
    if (VERBOSE) {
      log(`  ❌ ${issue.message}`, 'red');
    }
  }
  
  // Count easy words (after fixes)
  for (const words of Object.values(wordBank.easy)) {
    if (Array.isArray(words)) {
      easyWords += words.length;
    }
  }
  
  // Validate hard difficulty
  log('📚 Checking "hard" difficulty...', 'yellow');
  const hardResult = validateDifficulty(wordBank.hard, 'hard');
  totalIssues += hardResult.issues.length;
  totalFixCount += hardResult.fixCount;
  totalRemovedCount += hardResult.removedCount || 0;
  
  for (const issue of hardResult.issues) {
    issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
    if (VERBOSE) {
      log(`  ❌ ${issue.message}`, 'red');
    }
  }
  
  // Count hard words (after fixes)
  for (const words of Object.values(wordBank.hard)) {
    if (Array.isArray(words)) {
      hardWords += words.length;
    }
  }
  
  totalWords = easyWords + hardWords;
  
  // Cross-difficulty duplicates
  log('🔄 Checking cross-difficulty duplicates...', 'magenta');
  const crossResult = validateCrossDifficultyDuplicates(wordBank);
  totalIssues += crossResult.issues.length;
  issueBreakdown.cross_difficulty_duplicate = crossResult.issues.length;
  totalFixCount += crossResult.fixCount;
  
  for (const issue of crossResult.issues) {
    if (VERBOSE) {
      log(`  ⚠️  ${issue.message}`, 'yellow');
    }
  }
  
  // Invalid characters (non a-z)
  log('🔤 Checking for invalid characters...', 'blue');
  const charResult = validateNoSpacesOrPunctuation(wordBank);
  totalIssues += charResult.issues.length;
  issueBreakdown.invalid_characters = charResult.issues.length;
  totalFixCount += charResult.fixCount;
  totalRemovedCount += charResult.fixCount;
  
  for (const issue of charResult.issues) {
    if (VERBOSE) {
      log(`  ❌ ${issue.message}`, 'red');
    }
  }
  
  // Uppercase validation (with auto-fix)
  log('🔠 Checking for uppercase letters...', 'cyan');
  const caseResult = validateUppercase(wordBank);
  totalIssues += caseResult.issues.length;
  issueBreakdown.not_lowercase = caseResult.issues.length;
  totalFixCount += caseResult.fixCount;
  
  for (const issue of caseResult.issues) {
    if (VERBOSE && !FIX) {
      log(`  ⚠️  ${issue.message}`, 'yellow');
    }
  }
  
  // Calculate moved count (length mismatches that were fixed by moving)
  const movedCount = (easyResult.fixCount - (easyResult.removedCount || 0)) + 
                     (hardResult.fixCount - (hardResult.removedCount || 0));
  
  // Print summary
  printSummary({
    totalWords,
    easyWords,
    hardWords,
    totalIssues,
    fixedCount: totalFixCount,
    removedCount: totalRemovedCount,
    movedCount: movedCount,
    issueBreakdown,
  });
  
  // Save fixes if any
  if (FIX && totalFixCount > 0) {
    // Re-sort arrays for consistency
    for (const difficulty of ['easy', 'hard']) {
      for (const lengthKey of Object.keys(wordBank[difficulty])) {
        if (Array.isArray(wordBank[difficulty][lengthKey])) {
          wordBank[difficulty][lengthKey].sort();
        }
      }
    }
    writeWordBank(wordBank, totalFixCount);
  } else if (FIX && totalFixCount === 0) {
    log('✅ No fixes needed.', 'green');
  }
  
  // Exit with error code if there are unfixable issues
  const unfixableIssues = issueBreakdown.not_array + issueBreakdown.not_string;
  
  if (unfixableIssues > 0) {
    log(`\n⚠️  ${unfixableIssues} issue(s) require manual review.`, 'yellow');
    process.exit(1);
  }
}

// Run the validator
main();
