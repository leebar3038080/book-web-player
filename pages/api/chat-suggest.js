import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, word, context } = req.body || {};
  if (!message || !word || !context) {
    return res.status(400).json({ error: "Missing message, word or context" });
  }

  try {
    const prompt = `
    You are helping a user refine word choice.
    Current word: "${word}"
    Context:
    ---
    ${context}
    ---
    User request: "${message}"

    Suggest up to 5 better alternative words in ENGLISH.
    Return ONLY valid JSON:
    { "suggestions": ["word1", "word2", "word3"] }
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let raw = completion.choices[0]?.message?.content || "{}";
    let out;
    try {
      out = JSON.parse(raw);
    } catch {
      out = { suggestions: [] };
    }

    if (!out || !Array.isArray(out.suggestions)) {
      out = { suggestions: [] };
    }

    res.status(200).json(out);
  } catch (err) {
    console.error("Chat-Suggest API error:", err);
    res.status(500).json({ error: "Failed to get chat suggestions" });
  }
}
