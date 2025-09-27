import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { word, context, message } = req.body || {};
    const userMessage = (typeof message === "string" && message.trim()) || "";

    if (!word || !context || !userMessage) {
      return res.status(200).json({ suggestions: [] });
    }

    // --- זיהוי מצב מיוחד: תרגום ---
    if (/תרגם/i.test(userMessage)) {
      const prompt = `
Translate the word "${word}" into Hebrew.
Return ONLY a JSON object:
{"translation":"..."}
      `;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });

      let raw = completion.choices?.[0]?.message?.content ?? "{}";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      }

      let out;
      try {
        out = JSON.parse(raw);
      } catch {
        out = { translation: "❌ Translation error" };
      }

      return res.status(200).json({
        suggestions: out.translation ? [out.translation] : [],
      });
    }

    // --- זיהוי מצב מיוחד: "תן את המילה X" ---
    const matchSpecific = userMessage.match(/תן את המילה\s+(.+)/i);
    if (matchSpecific) {
      const target = matchSpecific[1].trim();
      const prompt = `
Translate the Hebrew word "${target}" into English.
Return ONLY a JSON object:
{"word":"..."}
      `;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });

      let raw = completion.choices?.[0]?.message?.content ?? "{}";
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      }

      let out;
      try {
        out = JSON.parse(raw);
      } catch {
        out = { word: "" };
      }

      return res.status(200).json({
        suggestions: out.word ? [out.word] : [],
      });
    }

    // --- ברירת מחדל: הצעות למילה באנגלית ---
    const sys = [
      "You propose precise ENGLISH replacements that fit literary context.",
      "Each suggestion should be 1 word (preferred) or max 2 words.",
      "The replacement must fit grammatically in the sentence.",
      "Output strictly JSON: {\"suggestions\":[\"w1\",\"w2\",...]}.",
      "No explanations, no Hebrew.",
    ].join(" ");

    const usr = `Target word: "${word}"
Context:
${context}

User intent: "${userMessage}"

Return ONLY JSON like: {"suggestions":["priests","ministers","rabbis"]}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    });

    let text = completion.choices?.[0]?.message?.content ?? "";
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
    }

    let out = null;
    try {
      out = JSON.parse(text);
    } catch {
      out = null;
    }

    if (!out || !Array.isArray(out.suggestions)) {
      out = { suggestions: [] };
    }

    out.suggestions = out.suggestions
      .map((w) => String(w).trim())
      .filter(Boolean)
      .filter((w) => /^[A-Za-z][A-Za-z\-']*$/.test(w))
      .slice(0, 6);

    return res.status(200).json(out);
  } catch (err) {
    console.error("chat-suggest error:", err);
    return res.status(200).json({ suggestions: [] });
  }
}
