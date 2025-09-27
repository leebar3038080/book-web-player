import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractTargetFromMessage(msg) {
  // 1) בתוך מירכאות
  const q = msg.match(/["'״“”׳](.+?)["'״“”׳]/);
  if (q?.[1]) return q[1].trim();

  // 2) אחרי ביטויי "תן את המילה", "המילה", "translate"
  const k = msg.match(/(?:תן(?: לי)?(?: את)?(?: המילה)?|המילה|translate)\s+([^\n]+)$/i);
  if (k?.[1]) return k[1].trim();

  // 3) מילה בעברית בתוך ההודעה
  const he = msg.match(/[\u0590-\u05FF][\u0590-\u05FF\s'--]*/);
  if (he?.[0]) return he[0].trim();

  // 4) מילה באנגלית בתוך ההודעה
  const en = msg.match(/[A-Za-z][A-Za-z\s'--]*/);
  if (en?.[0]) return en[0].trim();

  return null;
}

function hasHebrew(s) { return /[\u0590-\u05FF]/.test(s); }
function hasLatin(s)  { return /[A-Za-z]/.test(s); }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { word, context, message } = req.body || {};
    const userMessage = (typeof message === "string" && message.trim()) || "";
    if (!word || !context || !userMessage) return res.status(200).json({ suggestions: [] });

    // זיהוי מצב תרגום
    const wantsTranslate = /תרגם|translate/i.test(userMessage) ||
                           /מה המילה באנגלית|מה המילה בעברית|תן את המילה/i.test(userMessage);

    if (wantsTranslate) {
      // יעד לתרגום: מהמחרוזת או ברירת מחדל למילה שנלחצה
      let target = extractTargetFromMessage(userMessage) || word;

      // כיוון ברירת מחדל: עברית→אנגלית אם יש עברית ב-target, אחרת אנגלית→עברית
      let toEnglish = /לאנגלית|באנגלית|english/i.test(userMessage);
      let toHebrew  = /לעברית|בעברית|hebrew/i.test(userMessage);
      if (!toEnglish && !toHebrew) {
        toEnglish = hasHebrew(target);
        toHebrew  = !toEnglish;
      }

      const langOut = toEnglish ? "English" : "Hebrew";
      const translationPrompt = `
Translate the following word or short phrase into ${langOut}.
Return ONLY the translation, no explanations, no quotes, no punctuation.
If more than one common option exists, return up to 2 separated by " / ".

Text: "${target}"
      `;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are a precise, concise translator." },
          { role: "user", content: translationPrompt },
        ],
      });

      let text = completion.choices?.[0]?.message?.content?.trim() || "";
      // ניקוי בסיסי
      text = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      // פיצול לאופציות אם יש מפריד
      const parts = text.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean).slice(0, 2);
      return res.status(200).json({ suggestions: parts.length ? parts : [text] });
    }

    // מצב נרדפים קצרים שמתאימים תחבירית
    const sys = `
You propose succinct replacement candidates for a target token in context.
Constraints:
- 1 word preferred; max 2 words.
- Must fit grammatically in the SAME slot as the target.
- Keep a literary tone; avoid slang and marketing terms.
- Output STRICT JSON: {"suggestions":["w1","w2",...]} with 3–6 items.
`;

    const usr = `Target word: "${word}"

Context:
${context}

User request: "${userMessage}"
Return ONLY JSON with suggestions that would slot in grammatically where the target is.`;

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

    // ניקוי סופי והגבלת אורך ל-2 מילים
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
