import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
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

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    index: null,
  });

  useEffect(() => {
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const flat = [];
        data.segments.forEach((seg) => {
          seg.words.forEach((w) =>
            flat.push({
              text: w.word,
              original: w.word, // נוסיף גם את המקור
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
    const rect = e.target.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY + rect.height + 6;

    const word = words[index];
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
        body: JSON.stringify({ word: word.text, context }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Request failed");

      let suggestions = data?.suggestions || [];

      // אם המילה שונתה – נוסיף גם את המקור בראש הרשימה
      if (word.text !== word.original) {
        suggestions = [
          { word: word.original + " (original)", isRecommended: false },
          ...suggestions,
        ];
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
    const next = [...words];
    next[popup.index] = {
      ...next[popup.index],
      text: word.replace(" (original)", ""),
    };
    setWords(next);
    closePopup();
  }

  function closePopup() {
    setPopup((p) => ({ ...p, visible: false }));
  }

  // קליק ימני
  function handleContextMenu(e, index) {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      index,
    });
  }

  function playFromHere() {
    if (contextMenu.index == null || !audioRef.current) return;
    audioRef.current.currentTime = words[contextMenu.index].start;
    audioRef.current.play();
    setContextMenu((c) => ({ ...c, visible: false }));
  }

  function closeContextMenu() {
    setContextMenu((c) => ({ ...c, visible: false }));
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
            onContextMenu={(e) => handleContextMenu(e, i)}
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
                      onClick={() =>
                        applySuggestion(s.word || s.replace(" (original)", ""))
                      }
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
                      {s.word || s} {s.isRecommended ? "⭐" : ""}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* תפריט קליק ימני */}
      {contextMenu.visible && (
        <div
          style={{
            position: "absolute",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "white",
            border: "1px solid #333",
            borderRadius: 6,
            padding: 8,
            zIndex: 9999,
          }}
        >
          <div
            style={{ cursor: "pointer", padding: "4px 8px" }}
            onClick={playFromHere}
          >
            🎧 נגן מפה
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#666",
              cursor: "pointer",
            }}
            onClick={closeContextMenu}
          >
            סגור ✖
          </div>
        </div>
      )}
    </div>
  );
}
