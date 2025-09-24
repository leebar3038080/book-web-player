import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef(null);
  const wordRefs = useRef([]);

  useEffect(() => {
    // טוען את המילים מהקובץ JSON
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const flat = [];
        data.segments.forEach((seg) => {
          seg.words.forEach((w) =>
            flat.push({
              text: w.word,
              start: w.start,
              end: w.end,
            })
          );
        });
        setWords(flat);
      });
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !words.length) return;
      const t = audio.currentTime;
      const idx = words.findIndex((w) => t >= w.start && t < w.end);
      if (idx !== -1) setCurrentIndex(idx);
    }, 100);
    return () => clearInterval(interval);
  }, [words]);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>WhisperX Web Player</h1>
      <audio controls ref={audioRef}>
        <source src="/chapter_one_shimmer.mp3" type="audio/mpeg" />
      </audio>

      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          lineHeight: 1.8,
          fontSize: 18,
          borderRadius: 8,
          width: "100%", // תופס את כל הרוחב
          whiteSpace: "normal",
          wordWrap: "break-word",
          marginTop: 20,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            ref={(el) => (wordRefs.current[i] = el)}
            style={{
              background: i === currentIndex ? "yellow" : "transparent",
              marginRight: 4,
              borderRadius: 4,
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}
