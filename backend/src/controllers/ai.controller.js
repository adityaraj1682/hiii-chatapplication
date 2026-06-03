import axios from 'axios';

// 🗺️ FIXED: Updated to clean, standard ISO short-codes for perfect routing!
const LANGUAGE_CODE_MAP = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  hindi: "hi",
  japanese: "ja",
  chinese: "zh-CN",
  korean: "ko",
  arabic: "ar",
  russian: "ru"
};

/**
 * 🌐 HYBRID REAL-TIME TEXT TRANSLATION CONTROLLER
 */
export async function translateText(req, res) {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ message: "Text and targetLanguage parameters are required." });
    }

    const normalizedTarget = targetLanguage.toLowerCase().trim();
    const targetCode = LANGUAGE_CODE_MAP[normalizedTarget];

    if (!targetCode) {
      return res.status(400).json({ 
        message: `Language '${targetLanguage}' is not supported yet. Supported languages: ${Object.keys(LANGUAGE_CODE_MAP).join(', ')}` 
      });
    }

    console.log(`🤖 AI Engine: Translating cleanly to standard code [${targetCode}]...`);

    const response = await axios.get(
      `https://translate.googleapis.com/translate_a/single`,
      {
        params: {
          client: "gtx",
          sl: "auto",      // Instantly detects whatever language your friend typed in!
          tl: targetCode,  // Routes perfectly to the standard short-code now
          dt: "t",
          q: text
        },
        timeout: 10000
      }
    );

    const translatedText = response.data?.[0]?.[0]?.[0];

    if (!translatedText) {
      return res.status(502).json({ message: "Failed to parse text from public translation layer." });
    }

    return res.status(200).json({ 
      success: true, 
      originalText: text,
      translatedText: translatedText 
    });

  } catch (error) {
    console.error("❌ TRANSLATION HYBRID PIPELINE EXCEPTION:", error.message);
    return res.status(500).json({ message: `Translation engine fault: ${error.message}` });
  }
}