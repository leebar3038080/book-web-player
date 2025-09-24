export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { word, context } = req.body || {};
  if (!word || !context) {
    return res.status(400).json({ error: "Missing 'word' or 'context'" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "You rewrite words in context. Return up to 2 concise alternative words that fit the exact context and tone. Keep the same language and casing as the original. Respond ONLY as a JSON array of strings.",
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nTarget word: "${word}"\nReturn up to 2 alternative words as JSON array only.`,
          },
        ],
        max_output_tokens: 60,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    // 🔍 הדפסה ללוגים של Vercel
    console.log("🔍 RAW OpenAI response:", JSON.stringify(data, null, 2));

    // מנסים למצוא טקסט מהפלט
    let text = "";
    if (data.output_text) {
      text = data.output_text;
    } else if (data.output?.[0]?.content?.[0]?.text) {
      text = data.output[0].content[0].text;
    }

    let suggestions = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 2);
      }
    } catch {
      // fallback parsing
      suggestions = text
        .replace(/[\[\]\n"]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2);
    }

    return res.status(200).json({ suggestions });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
