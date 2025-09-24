export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { word, context } = req.body;

    const prompt = `
You are a helpful text editor assistant.
Your task: suggest 3–5 alternative words or phrases that would fit naturally in this text.

Current word: "${word}"
Context (surrounding text):
---
${context}
---

Guidelines:
- Suggestions must preserve the meaning of the sentence.
- Use natural language (not code or JSON).
- Keep them short and clear.
- Return only the suggestions, each on a new line.
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

    // מפענח את התשובה לשורות
    const text = data.output_text || "";
    const suggestions = text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return res.status(200).json({ suggestions });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
