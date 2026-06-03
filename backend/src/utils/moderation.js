import { pipeline } from '@xenova/transformers';

let classifier = null;

// 🛡️ NATIVE FAST BLACKLIST (Catches raw, phonetic Hinglish slangs instantly before model evaluation)
const LOCAL_HINDI_BLACKLIST = [
  "chutiya", "chutiye", "chutiyaap", "bhadwa", "bhadwe", "bkl", "gandu", 
  "saala", "saali", "harami", "kamina", "madarchod", "behenchod", "bhenchod", 
  "mc", "bc", "laundiya", "kamine", "randi", "lawda", "lavda"
];

/**
 * Initializes the Multilingual AI classifier pool instance
 */
async function getClassifier() {
  if (!classifier) {
    // 🌍 Using a powerful multilingual model container that understands over 100+ global languages natively
    classifier = await pipeline('text-classification', 'Xenova/bert-base-multilingual-uncased-sentiment');
  }
  return classifier;
}

/**
 * Hybrid Multilingual Local Moderation Engine
 * 100% Free - Requires no cloud API keys, cards, or billing profiles.
 */
export async function isContentSafe(text) {
  if (!text || text.trim() === "") return true;

  const normalizedText = text.toLowerCase().trim();

  // 🚪 LAYER 1: Fast Local Slang Intercept Gate
  const words = normalizedText.split(/[\s,.\-_!@#$%^&*()]+/);
  const containsLocalProfanity = words.some(word => LOCAL_HINDI_BLACKLIST.includes(word));

  if (containsLocalProfanity) {
    console.log(`🚨 [Moderation Block] Abusive text caught instantly by local Hinglish blacklist.`);
    return false; // Instant block execution
  }

  // 🚪 LAYER 2: Local Multilingual Context Evaluation 
  try {
    const model = await getClassifier();
    const results = await model(text);

    console.log(`\n--- [Local AI Multilingual Moderation Audit] ---`);
    console.log(` -> Primary Classification Match:`, results);
    console.log(`------------------------------------------------\n`);

    // The multilingual model maps text output predictions as star labels ("1 star" to "5 stars")
    // "1 star" and "2 stars" mean the text has heavy negative sentiments, toxic context, or abusive intents.
    if (results && results.length > 0) {
      const topMatch = results[0];
      const matchedLabel = topMatch.label; // e.g., "1 star" or "2 stars"
      const confidenceScore = topMatch.score;

      // Strict Trigger Rule: If the message matches toxic negativity with high confidence, block it
      if ((matchedLabel === '1 star' || matchedLabel === '2 stars') && confidenceScore > 0.60) {
        console.log(`🚨 [Moderation Block] Highly negative or abusive multi-language context detected (${(confidenceScore * 100).toFixed(2)}%)`);
        return false;
      }
    }

    return true; // Content cleared successfully

  } catch (error) {
    console.error("❌ Local Multilingual processing breakdown:", error.message);
    return true; // Fail-safe default: let the message post if the model fails to keep app functional
  }
}