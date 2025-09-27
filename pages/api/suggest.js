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
You are an assistant for literary editing.
Suggest 3–5 alternative **English** words for the word "${word}" that would fit naturally and grammatically in the sentence context below.

Context:
---
${context}
---

Guidelines:
- Prefer single words. If unavoidable, allow up to 2 words.
- The replacement must be grammatically correct in the sentence.
- The tone should match a literary narrative (natural and flowing).
- Do NOT explain, only output JSON.

Return ONLY valid JSON:
{ "suggestions": ["word1","word2","word3"] }
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
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
