import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const wordRefs = useRef([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

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
              original: w.word, // נשמור גם את המילה המקורית
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

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentIndex(-1);
    }
  };

  const handleSlower = () => {
    if (audioRef.current) {
      const newSpeed = Math.max(0.5, speed - 0.1);
      audioRef.current.playbackRate = newSpeed;
      setSpeed(newSpeed);
    }
  };

  const handleFaster = () => {
    if (audioRef.current) {
      const newSpeed = Math.min(1.5, speed + 0.1);
      audioRef.current.playbackRate = newSpeed;
      setSpeed(newSpeed);
    }
  };

  const handleWordClick = (i) => {
    setSelectedIndex(i);
  };

  const restoreOriginal = () => {
    if (selectedIndex !== null) {
      const copy = [...words];
      copy[selectedIndex].text = copy[selectedIndex].original;
      setWords(copy);
      setSelectedIndex(null);
    }
  };

  const playFromHere = () => {
    if (selectedIndex !== null && audioRef.current) {
      audioRef.current.currentTime = words[selectedIndex].start;
      audioRef.current.play();
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>WhisperX Web Player</h1>

      {/* נגן חבוי - לא מציג את סרגל השליטה של הדפדפן */}
      <audio ref={audioRef} hidden>
        <source src="/chapter_one_shimmer.mp3" type="audio/mpeg" />
      </audio>

      {/* כפתורים לשליטה */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={handlePlay}>▶ Play</button>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleStop}>⏹ Stop</button>
        <button onClick={handleSlower}>⏪ Slower</button>
        <button onClick={handleFaster}>⏩ Faster</button>
        <span style={{ marginLeft: 10 }}>Speed: {speed.toFixed(1)}x</span>
      </div>

      {/* תפריט לפעולות על מילה מסומנת */}
      {selectedIndex !== null && (
        <div
          style={{
            marginBottom: 20,
            padding: 10,
            border: "1px solid #aaa",
            borderRadius: 6,
            background: "#f9f9f9",
          }}
        >
          <p>
            מילה נבחרה:{" "}
            <strong>{words[selectedIndex]?.text}</strong>
          </p>
          <button onClick={restoreOriginal}>🔄 חזור למקור</button>
          <button onClick={playFromHere} style={{ marginLeft: 10 }}>
            🎧 השמע מכאן
          </button>
        </div>
      )}

      {/* רובריקה עם כל הטקסט */}
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
            onClick={() => handleWordClick(i)}
            style={{
              background:
                i === currentIndex
                  ? "yellow"
                  : i === selectedIndex
                  ? "#a0d8ef"
                  : "transparent",
              marginRight: 4,
              borderRadius: 4,
              cursor: "pointer",
              padding: "2px 4px",
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}
