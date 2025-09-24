import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef(null);

  useEffect(() => {
    // נטען את המילים מה-API
    fetch("/api/book")
      .then(res => res.json())
      .then(data => {
        const flat = [];
        data.segments.forEach(seg => {
          seg.words.forEach(w => flat.push(w));
        });
        setWords(flat);
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !words.length) return;
      const t = audio.currentTime;
      const idx = words.findIndex(w => t >= w.start && t < w.end);
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
      <div style={{ marginTop: "20px", lineHeight: "1.8" }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              background: i === currentIndex ? "yellow" : "transparent",
              marginRight: "4px"
            }}
          >
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
}
