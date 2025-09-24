// pages/index.js
import { useState } from "react";
import chapterOne from "../chapter_one_shimmer.json";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const playAudio = async () => {
    try {
      setLoading(true);
      setAudioUrl(null);

      // לוקחים את הטקסט מה־JSON
      const text = chapterOne.text;

      // שולחים בקשה ל־API שלנו (tts.js)
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audio");
      }

      // מקבלים Blob ומייצרים כתובת לנגן
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // מנגנים אוטומטית
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error("Error:", err);
      alert("בעיה בהשמעת הסאונד");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>WhisperX Web Player</h1>

      {/* מציג את הטקסט מה־JSON */}
      <div
        style={{
          whiteSpace: "pre-wrap",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
          maxWidth: "600px",
        }}
      >
        {chapterOne.text}
      </div>

      <button onClick={playAudio} disabled={loading}>
        {loading ? "טוען..." : "השמע סאונד"}
      </button>

      {audioUrl && (
        <div style={{ marginTop: 20 }}>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
}
