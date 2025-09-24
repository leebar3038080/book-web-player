export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { word, context } = req.body;

    const prompt = `
You are a helpful text editor assistant.
Suggest 3–5 alternative words or short phrases that would fit naturally in this context.
One of them should be clearly marked as the most recommended choice.

Current word: "${word}"
Context:
---
${context}
---

Format your answer as:
word
word
word (recommended)
word
    `;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("API error:", data);
      return res.status(500).json({ error: "API request failed" });
    }

    // חילוץ הטקסט
    let text = "";
    if (data.output_text) {
      text = data.output_text;
    } else if (
      data.output &&
      Array.isArray(data.output) &&
      data.output[0]?.content?.[0]?.text
    ) {
      text = data.output[0].content[0].text;
    }

    // פירוק לשורות + סימון ההמלצה
    const suggestions = text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((line) => ({
        word: line.replace(/\(recommended\)/i, "").trim(),
        isRecommended: /\(recommended\)/i.test(line),
      }));

    return res.status(200).json({ suggestions });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
