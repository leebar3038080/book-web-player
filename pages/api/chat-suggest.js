import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- helpers ----------
const hasHebrew = (s) => /[\u0590-\u05FF]/.test(s || "");
const hasLatin  = (s) => /[A-Za-z]/.test(s || "");

function extractTarget(msg) {
  if (!msg) return null;

  // 1) quoted
  const q = msg.match(/["'״“”׳](.+?)["'״“”׳]/);
  if (q?.[1]) return q[1].trim();

  // 2) אחרי "תן את המילה"/"המילה"/"translate"
  const k = msg.match(/(?:^|\s)(?:תן(?:\s+לי)?(?:\s+את)?(?:\s+המילה)?|המילה|translate)\s+([^\n]+)$/i);
  if (k?.[1]) return k[1].trim().replace(/[.?!,:;)]+$/g, "");

  // 3) העדפה לעברית אם קיימת
  const he = msg.match(/[\u0590-\u05FF][\u0590-\u05FF\s'’-]*/);
  if (he?.[0]) return he[0].trim();

  // 4) אחרת אנגלית
  const en = msg.match(/[A-Za-z][A-Za-z\s'’-]*/);
  if (en?.[0]) return en[0].trim();

  return null;
}

function wantsTranslate(msg) {
  if (!msg) return false;
  return /(תרגם|תרגום|איך אומרים|מה המילה|תן(?:\s+לי)?(?:\s+את)?(?:\s+המילה)?|translate)/i.test(msg);
}

function direction(msg, target) {
  const toEn = /(לאנגלית|באנגלית|english)/i.test(msg);
  const toHe = /(לעברית|בעברית|hebrew)/i.test(msg);
  if (toEn) return "en";
  if (toHe) return "he";
  // ברירת מחדל: יש עברית → לאנגלית, אחרת לא־עברית → לעברית
  return hasHebrew(target) ? "en" : "he";
}

// ---------- handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { word, context, message } = req.body || {};
    const userMessage = (typeof message === "string" && message.trim()) || "";
    if (!word || !context || !userMessage) return res.status(200).json({ suggestions: [] });

    // --- translate mode ---
    if (wantsTranslate(userMessage)) {
      const target = extractTarget(userMessage) || word;
      const dir = direction(userMessage, target); // "en" or "he"
      const langOut = dir === "en" ? "English" : "Hebrew";

      const translationPrompt = `
Translate the following word or short phrase into ${langOut}.
Return ONLY the translation, no explanations, no quotes, no punctuation.
If two common options exist, return them separated by " / ".
Text: "${target}"
      `.trim();

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are a precise, concise translator." },
          { role: "user", content: translationPrompt },
        ],
      });

      let text = completion.choices?.[0]?.message?.content?.trim() || "";
      text = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      const parts = text.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean).slice(0, 2);

      return res.status(200).json({ suggestions: parts.length ? parts : [text] });
    }

    // --- synonym/assist mode ---
    const sys = `
You are a concise language assistant.
- Suggest short replacements that fit grammatically in the SAME slot as the target.
- 1 word preferred; max 2 words.
- Literary tone; no slang/marketing.
- If user asks for definition/examples, answer briefly.
- Output STRICT JSON: {"suggestions":["w1","w2",...]} with 3–6 items.
`.trim();

    const usr = `Target word: "${word}"

Context:
${context}

User request: "${userMessage}"
Return ONLY JSON with suggestions that would fit grammatically where the target appears.`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    });

    let text = completion.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "").trim();

    let out = null;
    try { out = JSON.parse(text); } catch {
      const m = text.match(/{[\s\S]*}/);
      if (m) { try { out = JSON.parse(m[0]); } catch {} }
    }
    if (!out || !Array.isArray(out.suggestions)) out = { suggestions: [] };

    out.suggestions = out.suggestions
      .map(s => String(s).trim())
      .filter(Boolean)
      .map(s => s.replace(/\s+/g, " "))
      .filter(s => s.split(" ").length <= 2)
      .slice(0, 6);

    return res.status(200).json(out);
  } catch (err) {
    console.error("chat-suggest error:", err);
    return res.status(200).json({ suggestions: [] });
  }
}
