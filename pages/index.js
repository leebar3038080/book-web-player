import { useState, useEffect } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  // לטעון את הטקסט מתוך chapter_one_shimmer.json
  useEffect(() => {
    async function loadText() {
      try {
        const res = await fetch("/chapter_one_shimmer.json");
        const data = await res.json();

        // מניח שיש שדה "text" או "content"
        setText(data.text || data.content || JSON.stringify(data));
      } catch (err) {
        console.error("שגיאה בטעינת JSON:", err);
      }
    }
    loadText();
  }, []);

  // לשלוח טקסט ל־API ולייצר אודיו
  async function handlePlay() {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("TTS API error");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // לנגן אוטומטית
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error("שגיאה בהשמעת אודיו:", err);
      alert("בעיה בהשמעת האודיו");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>WhisperX Web Player</h1>
      <div>
        <textarea
          style={{ width: "100%", height: "200px" }}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button onClick={handlePlay}>▶️ נגן</button>

      {audioUrl && (
        <div>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}
