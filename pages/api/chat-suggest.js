import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { word, context, message, prompt } = req.body || {};
    const userMessage =
      (typeof message === "string" && message.trim()) ||
      (typeof prompt === "string" && prompt.trim()) ||
      "";

    if (!word || !context || !userMessage) {
      // מחזיר 200 עם מערך ריק כדי לא להפיל את הלקוח
      return res.status(200).json({ suggestions: [] });
    }

    const sys = [
      "You propose precise single-word ENGLISH replacements that fit literary context.",
      "Output MUST be STRICT JSON only: {\"suggestions\":[\"w1\",\"w2\",...]}.",
      "Return 3-6 candidates. No explanations. No Hebrew.",
    ].join(" ");

    const usr = `Target word: "${word}"
Context:
${context}

User intent: "${userMessage}"

Return ONLY JSON like: {"suggestions":["priests","ministers","rabbis"]}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    });

    let text = completion.choices?.[0]?.message?.content ?? "";
    text = text.trim();

    // הסרת גדרות קוד אם הוחזרו
    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
      text = text.replace(/^```\s*|\s*```$/g, "").trim();
    }

    let out = null;
    // נסה JSON ישיר
    try { out = JSON.parse(text); } catch {}

    // אם נכשל, נסה לחלץ בלוק JSON
    if (!out || !Array.isArray(out.suggestions)) {
      const match = text.match(/{[\s\S]*}/);
      if (match) {
        try { out = JSON.parse(match[0]); } catch {}
      }
    }

    // נפילה עדינה: חילוץ מילים באנגלית
    if (!out || !Array.isArray(out.suggestions)) {
      const tokens = (text.match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1));
      const fallback = tokens.length ? tokens : text.split(/[\s,]+/);
      const clean = [...new Set(
        fallback
          .map(w => String(w).trim())
          .filter(Boolean)
          .filter(w => /^[A-Za-z][A-Za-z\-']*$/.test(w))
      )].slice(0, 6);
      out = { suggestions: clean };
    }

    // הבטחת טיפוס
    if (!Array.isArray(out.suggestions)) out.suggestions = [];
    out.suggestions = out.suggestions
      .map(w => String(w).trim())
      .filter(Boolean)
      .filter(w => /^[A-Za-z][A-Za-z\-']*$/.test(w))
      .slice(0, 6);

    return res.status(200).json(out);
  } catch (err) {
    console.error("chat-suggest error:", err);
    // מחזיר 200 עם מערך ריק כדי למנוע "שגיאת צ'אט" בצד לקוח
    return res.status(200).json({ suggestions: [] });
  }
}
