import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { word } = req.body;

  try {
    const prompt = `
    Translate the following word to Hebrew.
    Only return the single Hebrew word, without explanations or transliterations.
    Word: "${word}"
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const translation = completion.choices[0].message.content.trim();
    res.status(200).json({ translation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translation failed" });
  }
}
