// pages/api/chat-suggest.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, context } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "אתה עוזר לשפר ניסוחי מילים בטקסט ספרותי." },
        { role: "user", content: `קונטקסט: ${context}\nבקשה: ${message}` },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
