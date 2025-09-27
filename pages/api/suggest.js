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
You are an expert literary editor. 
Suggest up to 5 alternative English words OR short poetic phrases that could replace the word "${word}" in the following literary context:

---
${context}
---

Guidelines:
- The alternatives must feel natural in **literary fiction** (not marketing or slang).
- Include both **single-word options** and **short symbolic/poetic phrases**.
- Capture nuance, mood, and cultural/emotional resonance, not just dictionary synonyms.
- Prioritize words that could appear in a novel, evoking place, meaning, or atmosphere.
- Do NOT repeat the original word.
- Do NOT explain your choices.
- Response must be STRICT JSON of the form:
{ "suggestions": ["word1", "word2", "word3", "word4", "word5"] }

Examples of style (do NOT reuse these exact ones): 
"retreat", "sanctuary", "haven", "gathering place", "shrine"
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
