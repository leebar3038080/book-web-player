import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const wordRefs = useRef([]);

  const [popup, setPopup] = useState(null); // להצעות
  const [contextMenu, setContextMenu] = useState(null); // לתפריט ימני

  useEffect(() => {
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const flat = [];
        data.segments.forEach((seg) => {
          seg.words.forEach((w) =>
            flat.push({
              text: w.word,
              original: w.word,
              start: w.start,
              end: w.end,
            })
          );
        });
        setWords(flat);
      })
      .catch((err) => console.error("Error loading JSON:", err));
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

  const handlePlay = () => audioRef.current?.play();
  const handlePause = () => audioRef.current?.pause();
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

  // קליק שמאלי – הצעות
  const handleWordClick = async (i, e) => {
    e.preventDefault();
    try {
      const word = words[i];
      const context = words
        .slice(Math.max(0, i - 10), i + 10)
        .map((w) => w.text)
        .join(" ");

      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.text, context }),
      });
      const data = await res.json();

      let suggestions = Array.isArray(data?.suggestions)
        ? data.suggestions
        : [];

      if (word.text !== word.original) {
        suggestions = [word.original + " (original)", ...suggestions];
      }

      setPopup({
        x: e.clientX || 100,
        y: e.clientY || 100,
        index: i,
        suggestions,
      });
    } catch (err) {
      console.error("Suggestion error:", err);
      setPopup({
        x: e.clientX || 100,
        y: e.clientY || 100,
        index: i,
        suggestions: [],
      });
    }
  };

  const applySuggestion = (i, suggestion) => {
    const copy = [...words];
    copy[i].text = suggestion.replace(" (original)", "");
    setWords(copy);
    setPopup(null);
  };

  // קליק ימני – השמעה מהנקודה
  const handleContextMenu = (i, e) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX || 100,
      y: e.clientY || 100,
      index: i,
    });
  };

  const playFromHere = (i) => {
    if (audioRef.current) {
      audioRef.current.currentTime = words[i].start;
      audioRef.current.play();
      setContextMenu(null);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>WhisperX Web Player</h1>

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

      {/* טקסט */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          lineHeight: 1.8,
          fontSize: 18,
          borderRadius: 8,
          width: "100%",
          whiteSpace: "normal",
          wordWrap: "break-word",
          marginTop: 20,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            ref={(el) => (wordRefs.current[i] = el)}
            onClick={(e) => handleWordClick(i, e)}
            onContextMenu={(e) => handleContextMenu(i, e)}
            style={{
              background: i === currentIndex ? "yellow" : "transparent",
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

      {/* פופאפ הצעות */}
      {popup && (
        <div
          style={{
            position: "absolute",
            top: popup.y,
            left: popup.x,
            border: "1px solid #333",
            background: "white",
            padding: 10,
            borderRadius: 6,
            zIndex: 1000,
          }}
        >
          {popup.suggestions.length > 0 ? (
            popup.suggestions.map((s, idx) => (
              <div
                key={idx}
                style={{ padding: "4px 8px", cursor: "pointer" }}
                onClick={() => applySuggestion(popup.index, s)}
              >
                {s}
              </div>
            ))
          ) : (
            <div>אין הצעות</div>
          )}
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#666",
              cursor: "pointer",
            }}
            onClick={() => setPopup(null)}
          >
            סגור ✖
          </div>
        </div>
      )}

      {/* תפריט קליק ימני */}
      {contextMenu && (
        <div
          style={{
            position: "absolute",
            top: contextMenu.y,
            left: contextMenu.x,
            border: "1px solid #333",
            background: "white",
            padding: 8,
            borderRadius: 6,
            zIndex: 1000,
          }}
        >
          <div
            style={{ padding: "4px 8px", cursor: "pointer" }}
            onClick={() => playFromHere(contextMenu.index)}
          >
            🎧 השמע מכאן
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#666",
              cursor: "pointer",
            }}
            onClick={() => setContextMenu(null)}
          >
            סגור ✖
          </div>
        </div>
      )}
    </div>
  );
}
