// pages/api/translate.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { word, targetLang } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "אתה מתרגם מילים בלבד." },
        { role: "user", content: `תרגם את המילה "${word}" לשפה: ${targetLang}` },
      ],
    });

    const translation = completion.choices[0].message.content.trim();
    res.status(200).json({ translation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
