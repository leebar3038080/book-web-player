export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { word } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Suggest two synonyms for the word "${word}" in JSON array format.`,
      }),
    });

    const data = await response.json();
    console.log("🔍 RAW OpenAI response:", JSON.stringify(data, null, 2));

    let text = "";

    // מוודאים שיש תוכן
    if (data.output && data.output[0] && data.output[0].content[0]) {
      text = data.output[0].content[0].text;
    } else if (data.output_text) {
      text = data.output_text;
    }

    // ניקוי עטיפות ```json ו-```
    if (text) {
      text = text.replace(/```json|```/g, "").trim();
    }

    let suggestions = [];
    try {
      suggestions = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse error:", err, "on text:", text);
    }

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
}
