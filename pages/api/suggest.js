import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { word, context } = req.body || {};
  if (!word || !context) {
    return res.status(400).json({ error: "Missing word or context" });
  }

  try {
    const prompt = `
Suggest up to 5 alternative ENGLISH words or short phrases (1–2 words) 
that could naturally replace the word "${word}" in the following literary context. 
Focus on expressions that feel fluent, idiomatic, and suitable for the sentence, 
not just dictionary synonyms.

Context:
---
${context}
---

Return ONLY strict JSON with an array called "suggestions".
Example:
{ "suggestions": ["retreat","sanctuary","haven","gathering place","shrine"] }
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
    console.error("Suggest API error:", err);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
}
