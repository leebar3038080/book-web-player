// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const overlayRef = useRef(null);
  const wordRefs = useRef([]);

  const [popup, setPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    index: null,
    suggestions: [],
    loading: false,
    error: null,
  });

  // מילים שהוחלפו – שמורים באינדקסים
  const [highlighted, setHighlighted] = useState(new Set());

  useEffect(() => {
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const flat = [];
        data.segments.forEach((seg) => {
          seg.words.forEach((w) =>
            flat.push({
              text: w.word,
              original: w.word, // שמירת המילה המקורית
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

  const handlePlay = () => audioRef.current?.play();
  const handlePause = () => audioRef.current?.pause();
  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentIndex(-1);
  };
  const handleSlower = () => {
    if (!audioRef.current) return;
    const newSpeed = Math.max(0.5, speed - 0.1);
    audioRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };
  const handleFaster = () => {
    if (!audioRef.current) return;
    const newSpeed = Math.min(1.5, speed + 0.1);
    audioRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  function getContext(index) {
    const spanBack = 40;
    const spanForward = 20;
    const start = Math.max(0, index - spanBack);
    const end = Math.min(words.length, index + spanForward + 1);
    return words.slice(start, end).map((w) => w.text).join(" ");
  }

  async function handleWordClick(e, index) {
    e.preventDefault();

    // עצירת נגן ברגע שלוחצים מילה
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const rect = e.target.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY + rect.height + 6;

    const target = words[index]?.text;
    const context = getContext(index);

    setPopup({
      visible: true,
      x,
      y,
      index,
      suggestions: [],
      loading: true,
      error: null,
    });

    try {
      const resp = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: target, context }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Request failed");

      // הוספת המילה המקורית לרשימה אם היא שונתה
      const originalWord = words[index].original;
      const suggestions = data?.suggestions || [];
      if (target !== originalWord) {
        suggestions.push({ word: originalWord, isOriginal: true });
      }

      setPopup((p) => ({
        ...p,
        loading: false,
        suggestions,
      }));
    } catch (err) {
      setPopup((p) => ({
        ...p,
        loading: false,
        error: err?.message || "Unknown error",
      }));
    }
  }

  function applySuggestion(word) {
    if (popup.index == null) return;
    const idx = popup.index;
    const next = [...words];

    // אם חזרנו למקור
    if (word === words[idx].original) {
      next[idx] = { ...next[idx], text: words[idx].original };
      setWords(next);

      // להסיר את הצבע הכחול
      setHighlighted((prev) => {
        const copy = new Set(prev);
        copy.delete(idx);
        return copy;
      });
    } else {
      next[idx] = { ...next[idx], text: word };
      setWords(next);

      // לסמן בצבע כחול
      setHighlighted((prev) => {
        const copy = new Set(prev);
        copy.add(idx);
        return copy;
      });
    }

    closePopup();
  }

  function closePopup() {
    setPopup((p) => ({ ...p, visible: false }));
    // חידוש נגן אחרי סגירה
    if (audioRef.current) {
      audioRef.current.play();
    }
  }

  function handleWordRightClick(e, index) {
    e.preventDefault();
    if (!audioRef.current) return;
    audioRef.current.currentTime = words[index].start;
    audioRef.current.play();
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>WhisperX Web Player</h1>

      <audio ref={audioRef} hidden>
        <source src="/chapter_one_shimmer.mp3" type="audio/mpeg" />
      </audio>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handlePlay}>▶ Play</button>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleStop}>⏹ Stop</button>
        <button onClick={handleSlower}>⏪ Slower</button>
        <button onClick={handleFaster}>⏩ Faster</button>
        <span style={{ marginLeft: 10 }}>Speed: {speed.toFixed(1)}x</span>
      </div>

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
            onClick={(e) => handleWordClick(e, i)}
            onContextMenu={(e) => handleWordRightClick(e, i)}
            style={{
              background: i === currentIndex ? "yellow" : "transparent",
              marginRight: 4,
              borderRadius: 4,
              cursor: "pointer",
              color: highlighted.has(i) ? "blue" : "inherit",
            }}
          >
            {w.text}
          </span>
        ))}
      </div>

      {popup.visible && (
        <div
          style={{
            position: "absolute",
            left: popup.x,
            top: popup.y,
            minWidth: 250,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <strong>הצעות</strong>
            <button
              onClick={closePopup}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {popup.loading && <div>טוען...</div>}
          {popup.error && (
            <div style={{ color: "crimson" }}>שגיאה: {popup.error}</div>
          )}

          {!popup.loading && !popup.error && (
            <>
              {popup.suggestions.length === 0 ? (
                <div>אין הצעות</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {popup.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(s.word)}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        background: "#f8f8f8",
                        cursor: "pointer",
                        fontWeight: s.isRecommended ? "bold" : "normal",
                      }}
                    >
                      {s.word} {s.isRecommended ? "⭐" : ""}
                      {s.isOriginal ? " (מקורי)" : ""}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
