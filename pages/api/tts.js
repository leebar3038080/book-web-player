import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // שים את המפתח ב־Environment Variables ב־Vercel
});

export default async function handler(req, res) {
  try {
    const { chapter } = req.query;

    // קובץ ה־JSON של הספר
    const filePath = path.join(process.cwd(), "data", "chapter_one_shimmer.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    // לוקחים את הטקסט של הפרק הראשון (או לפי chapter)
    const text = json.chapters[0].text;

    // יצירת קריינות עם OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",   // מודל הקריינות
      voice: "alloy",             // אפשר לשנות קול
      input: text,
    });

    // החזרת קובץ mp3 כתשובה
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate audio" });
  }
}
