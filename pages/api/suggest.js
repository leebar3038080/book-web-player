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

Do NOT stay too close to the root meaning of the original word.  
Instead, focus on the **literary role and emotional effect** of the word in the sentence:  
- What atmosphere or feeling does it create?  
- How does it shape the reader’s sense of the place or moment?  

Choose fluent, idiomatic expressions that a novelist or essayist might use.  
Avoid generic dictionary synonyms like "destination", "journey", or "spot".  

Examples of the style of replacements (for "pilgrimage site" in a social/literary context):  
["retreat","sanctuary","haven","gathering place","shrine"]

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

    let text = completion.choices[0]?.message?.content || "{}";
    text = text.trim();

    // הסרת גדרות קוד אם חזרו
    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
      text = text.replace(/^```\s*|\s*```$/g, "").trim();
    }

    let out = null;
    try {
      out = JSON.parse(text);
    } catch {
      // ניסיון חילוץ JSON מגוש טקסט
      const match = text.match(/{[\s\S]*}/);
      if (match) {
        try { out = JSON.parse(match[0]); } catch {}
      }
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
