import { useState } from "react";
import chapterOne from "../chapter_one_shimmer.json";

export default function Home() {
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(false);

  const playAudio = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: chapterOne.text }),
      });

      const data = await response.json();
      setAudioSrc(data.url);
    } catch (error) {
      console.error("Error generating audio:", error);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>WhisperX Web Player</h1>
      <p>{chapterOne.text}</p>

      <button onClick={playAudio} disabled={loading}>
        {loading ? "Generating..." : "Play Audio"}
      </button>

      {audioSrc && (
        <audio controls autoPlay src={audioSrc} style={{ display: "block", marginTop: "1rem" }}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
