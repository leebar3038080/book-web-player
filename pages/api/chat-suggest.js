// מחזיר תמיד JSON: { suggestions: ["...", "..."] } באנגלית בלבד
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { word, context, prompt } = req.body || {};

  try {
    const sys = [
      "You help choose precise English replacement words in literary context.",
      "Output must be STRICT JSON only: {\"suggestions\":[\"w1\",\"w2\",...]}",
      "Return 3-6 single-word English alternatives that fit the given context.",
      "No explanations, no Hebrew, no punctuation besides JSON syntax.",
    ].join(" ");

    const user = `Target word: "${word}"
Context: "${context}"
User intent: "${prompt}"
Return only JSON with 'suggestions' as English words. Example: {"suggestions":["priests","ministers","rabbis"]}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    let text = completion.choices?.[0]?.message?.content?.trim() || "";
    let out = null;

    // ניסיון פרסינג ישיר
    try { out = JSON.parse(text); } catch (_) {}

    // אם המודל הוציא טקסט חופשי, נסה לחלץ מילים
    if (!out || !Array.isArray(out.suggestions)) {
      const candidates = (text.match(/"([^"]+)"/g) || []).map(s => s.replace(/(^")|("$)/g, ""));
      const fallback = candidates.length ? candidates : text.split(/[\s,]+/);
      const clean = [...new Set(fallback.map(w => String(w).trim()).filter(Boolean))]
        .filter(w => /^[A-Za-z][A-Za-z\-']*$/.test(w)) // רק מילים באנגלית
        .slice(0, 6);
      out = { suggestions: clean };
    }

    res.status(200).json(out);
  } catch (err) {
    console.error("chat-suggest error:", err);
    res.status(500).json({ error: "Chat suggest failed" });
  }
}
