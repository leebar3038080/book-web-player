import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const wordRefs = useRef([]);

  // מצב לפופאפ
  const [popup, setPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    index: null,
    suggestions: [],
    loading: false,
    error: null,
  });

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

  // הפקת הקשר סביב מילה
  function getContext(index, span = 20) {
    const start = Math.max(0, index - span);
    const end = Math.min(words.length, index + span + 1);
    return words.slice(start, end).map((w) => w.text).join(" ");
  }

  // טיפול בלחיצה על מילה
  async function handleWordClick(e, index) {
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

      setPopup((p) => ({
        ...p,
        loading: false,
        suggestions: data?.suggestions || [],
      }));
    } catch (err) {
      setPopup((p) => ({
        ...p,
        loading: false,
        error: err?.message || "Unknown error",
      }));
    }
  }

  // החלפת מילה
  function applySuggestion(s) {
    if (popup.index == null) return;
    const next = [...words];
    next[popup.index] = { ...next[popup.index], text: s };
    setWords(next);
    closePopup();
  }

  function closePopup() {
    setPopup((p) => ({ ...p, visible: false }));
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>WhisperX Web Player</h1>

      {/* נגן חבוי */}
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
            onClick={(e) => handleWordClick(e, i)}
            style={{
              background: i === currentIndex ? "yellow" : "transparent",
              marginRight: 4,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {w.text}
          </span>
        ))}
      </div>

      {/* פופאפ הצעות */}
      {popup.visible && (
        <div
          style={{
            position: "absolute",
            left: popup.x,
            top: popup.y,
            minWidth: 200,
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {popup.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(s)}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        background: "#f8f8f8",
                        cursor: "pointer",
                      }}
                    >
                      {s}
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
