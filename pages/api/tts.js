// pages/api/tts.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // יצירת אודיו עם OpenAI
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "shimmer", // אפשר לשנות קול אם תרצה
      input: text,
    });

    // החזרת האודיו ללקוח
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);

  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
