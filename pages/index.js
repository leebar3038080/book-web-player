import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/chapter_one_shimmer.json");
        const data = await res.json();

        // 1) אם יש text בכל segment – מחברים אותם
        let plain = "";
        if (Array.isArray(data.segments)) {
          const hasSegmentText = data.segments.every(
            (s) => typeof s.text === "string" && s.text.length
          );
          if (hasSegmentText) {
            plain = data.segments.map((s) => s.text).join(" ");
          } else {
            // 2) אחרת – בונים מה-words
            plain = data.segments
              .flatMap((s) => (s.words || []).map((w) => w.word))
              .join(" ");
          }
        } else if (typeof data.text === "string") {
          plain = data.text;
        }

        setText(plain.replace(/\s+/g, " ").trim());
      } catch (e) {
        console.error("שגיאה בטעינת JSON:", e);
      }
    })();
  }, []);

  async function handlePlay() {
    if (!text) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS API error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      new Audio(url).play();
    } catch (err) {
      console.error("בעיה בהשמעת האודיו:", err);
      alert("בעיה בהשמעת האודיו");
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>WhisperX Web Player</h1>

      <div
        style={{
          whiteSpace: "pre-wrap",
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 16,
          maxWidth: 900,
        }}
      >
        {text || "טוען..."}
      </div>

      <button onClick={handlePlay} disabled={!text}>
        ▶️ השמע
      </button>

      {audioUrl && (
        <div style={{ marginTop: 12 }}>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}
