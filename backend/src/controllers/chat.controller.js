import { generateStreamToken } from "../config/stream.js";
import dotenv from 'dotenv'
dotenv.config()
export async function getStreamToken(req,res){
    try {
        const token = generateStreamToken(req.user.id)
        res.status(200).json({ token })
    } catch (error) {
        console.error("Error in getStreamToken controller",error.message)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export async function askChatbot(req, res) {
  try {
    // ✅ FIX: Read your API token safely from your process environment variables
    const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;

    if (!HUGGINGFACE_ACCESS_TOKEN) {
      console.error("⚠️ Configuration Warning: process.env.HUGGINGFACE_ACCESS_TOKEN is missing!");
      return res.status(500).json({ message: "AI Token configurations are missing from backend environment variables." });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Invalid message payload structure." });
    }

    // Get the latest user message
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // 🎨 DETECTOR: Check if the user is explicitly asking to generate an image
    const imageKeywords = ["generate an image", "create an image", "draw", "generate a photo", "make a picture of"];
    const wantsImage = imageKeywords.some(keyword => lastUserMessage.toLowerCase().includes(keyword));

    if (wantsImage) {
      console.log("🎨 Image generation intent detected. Routing to Flux Schnell Engine...");
      
      // Extract a clean prompt from the user message
      let prompt = lastUserMessage;
      imageKeywords.forEach(keyword => {
        prompt = prompt.replace(new RegExp(keyword, 'gi'), '');
      });
      prompt = prompt.trim().replace(/^(of|a|an)\s+/i, '');

      // Fallback if the remaining prompt is empty
      if (!prompt) prompt = "A beautiful digital artwork portrait";

      // Call Hugging Face text-to-image pipeline route (Using ultra-fast Flux model)
      const imageResponse = await fetch(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HUGGINGFACE_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Flux Engine Error Payload:", errorText);
        return res.status(imageResponse.status).json({ 
          role: "assistant", 
          content: "I tried to paint that for you, but the image generator is currently overloaded. Please try again in a moment!" 
        });
      }

      // Read the binary image buffer and turn it into a Base64 Data URL
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`;

      return res.status(200).json({
        role: "assistant",
        content: `🎨 Here is your generated image for: "${prompt}"\n\n<img src="${base64Image}" alt="AI Generated" class="w-full h-auto rounded-xl mt-2 border border-base-300 shadow-md" />`
      });
    }

    // 💬 TEXT FALLBACK: Process normal text chat using the open text engine
    console.log("Routing dialogue string streams to Hugging Face Shared Routing Layer...");
    const textResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:fastest", 
          messages: [
            { role: "system", content: "You are a friendly, helpful AI community assistant. Keep answers relatively concise and engaging. If a user wants an image, tell them to use phrases like 'generate an image of...'" },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const data = await textResponse.json();

    if (!textResponse.ok) {
      console.error("Hugging Face Hub Error Payload:", data);
      return res.status(textResponse.status).json({ message: data.error || "Model provider error." });
    }

    const aiMessage = data.choices[0].message;
    return res.status(200).json(aiMessage);

  } catch (error) {
    console.error("Fatal error inside chatbot processing engine:", error.message);
    return res.status(500).json({ message: "Internal Server Error during AI sequence execution." });
  }
}