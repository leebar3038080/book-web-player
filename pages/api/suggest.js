import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { word, context } = req.body || {};
    if (!word || !context) {
      return res.status(200).json({ suggestions: [] });
    }

    const prompt = `
Suggest up to 5 single-word ENGLISH synonyms or replacements for the word "${word}" 
that fit in the following literary context:
---
${context}
---
Output ONLY valid JSON: {"suggestions":["...","..."]} without explanations.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    let text = completion.choices?.[0]?.message?.content?.trim() || "";

    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
      text = text.replace(/^```\s*|\s*```$/g, "").trim();
    }

    let out = null;
    try {
      out = JSON.parse(text);
    } catch (e) {
      out = null;
    }

    if (!out || !Array.isArray(out.suggestions)) {
      out = { suggestions: [] };
    }

    out.suggestions = out.suggestions
      .map((s) => String(s).trim())
      .filter(Boolean);

    return res.status(200).json(out);
  } catch (err) {
    console.error("suggest error:", err);
    return res.status(200).json({ suggestions: [] });
  }
}
