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

    // 🔑 בדיקה אם המשתמש ביקש "תרגם"
    if (userMessage.includes("תרגם")) {
      const translationPrompt = `
Translate the following English word into natural Hebrew. 
Return only the translation(s), without explanations or formatting.

Word: "${word}"
      `;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a concise translator." },
          { role: "user", content: translationPrompt },
        ],
      });

      let text = completion.choices?.[0]?.message?.content ?? "";
      text = text.trim();

      return res.status(200).json({ suggestions: [text] });
    }

    // 🔑 פרומפט רגיל (ללא "תרגם")
    const sys = `
You are a concise language assistant.
The user may ask to:
1. Translate a word or phrase → Respond only with the correct translation(s), in natural Hebrew, no explanations unless asked.
2. Explain meaning/usage → Provide a short, clear definition or context.
3. Give an example sentence → Provide 1–2 natural example sentences.
4. Suggest synonyms → Provide up to 5 single-word (or max 2-word) synonyms that fit grammatically in the sentence.

Rules:
- Keep answers short and directly usable.
- Prefer single words over long phrases unless the meaning requires two.
- If the user explicitly says "תרגם", always return only the translation.
- Do not add extra commentary like "here is the translation". Just the result.
`;

    const usr = `Target word: "${word}"
Context:
${context}

User request: "${userMessage}"`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    });

    let text = completion.choices?.[0]?.message?.content ?? "";
    text = text.trim();

    // סינון מילים באנגלית בלבד (במקרה של הצעות נרדפים)
    let suggestions = [];
    if (/^[A-Za-z\s,"]+$/.test(text)) {
      suggestions = text
        .split(/[\s,]+/)
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 6);
    } else {
      suggestions = [text];
    }

    return res.status(200).json({ suggestions });
  } catch (err) {
    console.error("chat-suggest error:", err);
    return res.status(200).json({ suggestions: [] });
  }
}
