import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { word, context, userMessage } = req.body;

  try {
    const prompt = `
    The user is editing text.
    Target word: "${word}"
    Context: "${context}"
    User request: "${userMessage}"

    Return ONLY a JSON object with 3-6 alternative words in English that fit the context.
    Example output: {"suggestions":["priests","ministers","rabbis"]}
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let text = completion.choices[0].message.content.trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // fallback: מנסה לחלץ מילים רגילות
      parsed = { suggestions: text.split(/\s|,|\n/).filter(Boolean) };
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat suggest failed" });
  }
}
