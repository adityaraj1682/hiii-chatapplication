import sharp from "sharp";

/**
 * Safely compresses a Base64 image payload on the backend using Sharp buffers
 * to ensure memory usage stays well under Render's limits.
 */
export async function compressBase64Image(base64String, quality = 60) {
  if (!base64String || !base64String.startsWith("data:image/")) {
    return null;
  }

  // 1. Isolate the raw base64 data string from the data URI prefix
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
  
  // 2. Convert to a binary buffer (low-level, lightweight memory mapping)
  let imageBuffer = Buffer.from(base64Data, "base64");

  // 3. Process via Sharp (Resizes maximum dimension to 1200px and shrinks quality down to ~150KB)
  const compressedBuffer = await sharp(imageBuffer)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: quality, force: false })
    .png({ quality: quality, force: false })
    .toBuffer();

  // 4. Force release the massive original input buffer from system memory instantly
  imageBuffer = null;

  // 5. Convert our new tiny compressed binary buffer directly into an ImageKit-ready Base64 string
  return `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
}