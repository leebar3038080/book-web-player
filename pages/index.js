import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);

  const audioRef = useRef(null); // MP3 ראשי
  const ttsRef = useRef(null);   // נגן TTS זמני למשפט
  const wordRefs = useRef([]);
  const ttsUrlRef = useRef(null); // לשחרור URL קודם

  const [popup, setPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    index: null,
    suggestions: [],
    loading: false,
    error: null,
  });

  const [highlighted, setHighlighted] = useState(new Set());
  const [isReplacing, setIsReplacing] = useState(false);

  // תרגומים להצעות
  const [translations, setTranslations] = useState({}); // { "word": "תרגום" }

  // צ'אט חופשי
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  // ✅ מצב חדש – בחירת פרק
  const [selectedChapter, setSelectedChapter] = useState("1");

  // טוען JSON + MP3 לפי הפרק שנבחר
  useEffect(() => {
    fetch(`/books/${selectedChapter}.json`)
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
        setCurrentIndex(-1);
        setHighlighted(new Set());

        // החלת שינויים שמורים מה־changes.json דרך ה־API
        fetch(`/api/changes`)
          .then((r) => r.json())
          .then(({ changes }) => {
            if (!Array.isArray(changes)) return;
            const chapterChanges = changes.filter(
              (c) => String(c.chapter) === String(selectedChapter)
            );
            if (!chapterChanges.length) return;

            // שמירת השינוי האחרון לכל אינדקס
            const latest = {};
            for (const c of chapterChanges) latest[c.index] = c;

            const changedSet = new Set();
            const updated = flat.map((w, i) => {
              const rec = latest[i];
              if (rec && typeof rec.newWord === "string") {
                const newText = rec.newWord;
                if (newText !== w.original) {
                  changedSet.add(i);
                }
                return { ...w, text: newText };
              }
              return w;
            });

            setWords(updated);
            setHighlighted(changedSet);
          })
          .catch(() => {});
      });

    if (audioRef.current) {
      audioRef.current.src = `/books/${selectedChapter}.mp3`;
      audioRef.current.load();
    }
  }, [selectedChapter]);

  // ✅ לוודא שתמיד מוחל ה־playbackRate גם אחרי מעבר פרק או שינוי מהירות
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    if (ttsRef.current) ttsRef.current.playbackRate = speed;
  }, [speed, selectedChapter]);

  // סנכרון ההדגשה הצהובה עם זמן ה-MP3 הראשי
  useEffect(() => {
    if (!audioRef.current) return;
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !words.length || isReplacing) return;
      const t = audio.currentTime;
      const idx = words.findIndex((w) => t >= w.start && t < w.end);
      if (idx !== -1) setCurrentIndex(idx);
    }, 80);
    return () => clearInterval(interval);
  }, [words, isReplacing]);

  // שליטה בסיסית
  const handlePlay = () => { if (!isReplacing) audioRef.current?.play(); };
  const handlePause = () => { audioRef.current?.pause(); ttsRef.current?.pause(); };
  const handleStop = () => {
    audioRef.current?.pause();
    audioRef.current.currentTime = 0;
    setCurrentIndex(-1);
    ttsRef.current?.pause();
    setIsReplacing(false);
  };
  const handleSlower = () => {
    const newSpeed = Math.max(0.5, speed - 0.1);
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    if (ttsRef.current) ttsRef.current.playbackRate = newSpeed;
  };
  const handleFaster = () => {
    const newSpeed = Math.min(1.5, speed + 0.1);
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    if (ttsRef.current) ttsRef.current.playbackRate = newSpeed;
  };

  // הקשר (40 מילים אחורה, 20 קדימה)
  function getContext(index) {
    const spanBack = 40;
    const spanForward = 20;
    const start = Math.max(0, index - spanBack);
    const end = Math.min(words.length, index + spanForward + 1);
    return words.slice(start, end).map((w) => w.text).join(" ");
  }

  // פתיחת פופאפ הצעות (קליק שמאלי)
  async function handleWordClick(e, index) {
    e.preventDefault();
    audioRef.current?.pause();
    ttsRef.current?.pause();

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

      const originalWord = words[index].original;
      const suggestions = (data?.suggestions || []).map(w => ({ word: w }));
      if (target !== originalWord) {
        suggestions.unshift({ word: originalWord, isOriginal: true });
      }

      setPopup((p) => ({ ...p, loading: false, suggestions }));
      setChatInput("");
      setChatError(null);
    } catch (err) {
      setPopup((p) => ({ ...p, loading: false, error: err?.message || "Unknown error" }));
    }
  }

  // חישוב גבולות משפט
  function getSentenceRange(index) {
    let s = index, e = index;
    while (s > 0) {
      const prev = words[s - 1]?.text || "";
      if (/[.!?]$/.test(prev)) break;
      s--;
    }
    while (e < words.length - 1) {
      const cur = words[e]?.text || "";
      if (/[.!?]$/.test(cur)) break;
      e++;
    }
    return [s, e];
  }

  function revokePrevTtsUrl() {
    if (ttsUrlRef.current) {
      URL.revokeObjectURL(ttsUrlRef.current);
      ttsUrlRef.current = null;
    }
  }

  // החלפה / חזרה למקור + TTS של המשפט
  async function applySuggestion(chosen) {
    if (popup.index == null) return;
    const idx = popup.index;
    const next = [...words];
    const isReturnToOriginal = chosen === words[idx].original;

    if (isReturnToOriginal) {
      next[idx] = { ...next[idx], text: words[idx].original };
      setWords(next);
      setHighlighted((prev) => { const copy = new Set(prev); copy.delete(idx); return copy; });

      // שמירת שינוי שמחזיר למקור
      try {
        await fetch("/api/changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapter: selectedChapter,
            index: idx,
            original: words[idx].original,
            newWord: words[idx].original,
          }),
        });
      } catch {}

      closePopup(false);
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, words[idx].start - 0.5);
        audioRef.current.play();
      }
      return;
    } else {
      next[idx] = { ...next[idx], text: chosen };
      setWords(next);
      setHighlighted((prev) => { const copy = new Set(prev); copy.add(idx); return copy; });

      // שמירת שינוי חדש
      try {
        await fetch("/api/changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapter: selectedChapter,
            index: idx,
            original: words[idx].original,
            newWord: chosen,
          }),
        });
      } catch {}
    }

    const [s, e] = getSentenceRange(idx);
    const sentenceText = next.slice(s, e + 1).map((w) => w.text).join(" ");
    const sentenceStart = words[s]?.start ?? words[idx].start;
    const sentenceEnd = words[e]?.end ?? words[idx].end;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = sentenceStart;
    }

    try {
      setIsReplacing(true);
      revokePrevTtsUrl();
      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentenceText }),
      });
      if (!resp.ok) throw new Error("TTS failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      ttsUrlRef.current = url;

      if (ttsRef.current) {
        ttsRef.current.src = url;
        ttsRef.current.playbackRate = speed;
        audioRef.current.playbackRate = speed;

        ttsRef.current.onplay = () => { audioRef.current?.pause(); };
        ttsRef.current.onended = () => {
          setIsReplacing(false);
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, sentenceEnd + 0.05);
            audioRef.current.play();
          }
          revokePrevTtsUrl();
        };

        await ttsRef.current.play();
      }
    } catch {
      setIsReplacing(false);
      audioRef.current?.play();
    }

    closePopup(false);
  }

  function closePopup(requestedResume = false) {
    setPopup((p) => ({ ...p, visible: false, index: null }));
    if (requestedResume && !isReplacing) audioRef.current?.play();
  }

  function handleWordRightClick(e, index) {
    e.preventDefault();
    if (ttsRef.current) { ttsRef.current.pause(); revokePrevTtsUrl(); setIsReplacing(false); }
    if (!audioRef.current) return;
    audioRef.current.currentTime = words[index].start;
    audioRef.current.play();
  }

  // תרגום מילה
  async function handleTranslate(word) {
    try {
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Translate failed");
      setTranslations((prev) => ({ ...prev, [word]: data.translation }));
    } catch {
      setTranslations((prev) => ({ ...prev, [word]: "❌ שגיאת תרגום" }));
    }
  }

  // מיזוג הצעות
  function mergeSuggestions(oldArr, newWords) {
    const seen = new Set(oldArr.map(o => o.word.toLowerCase()));
    const extras = [];
    for (const w of newWords) {
      const lw = String(w).trim();
      if (!lw) continue;
      const key = lw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push({ word: lw, isRecommended: true, fromChat: true });
    }
    return [...extras, ...oldArr];
  }

  // שליחת צ'אט
  async function handleChatSend() {
    if (!chatInput.trim() || popup.index == null) return;
    setChatLoading(true);
    setChatError(null);
    const idx = popup.index;
    const word = words[idx]?.text || "";
    const context = getContext(idx);

    try {
      const resp = await fetch("/api/chat-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, context, message: chatInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Chat failed");

      const arr = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setPopup(p => ({ ...p, suggestions: mergeSuggestions(p.suggestions, arr) }));
      setChatLoading(false);
    } catch {
      setChatLoading(false);
      setChatError("❌ שגיאת צ'אט");
    }
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", fontSize: "18px" }}>
      <h1>הנערה מהבית הוורד</h1>

      {/* ✅ בחירת פרק */}
      <div style={{ marginBottom: 20 }}>
        <label>בחר פרק: </label>
        <select
          value={selectedChapter}
          onChange={(e) => setSelectedChapter(e.target.value)}
        >
          {Array.from({ length: 53 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              פרק {i + 1}
            </option>
          ))}
        </select>
      </div>

      <audio ref={audioRef} hidden>
        <source src={`/books/${selectedChapter}.mp3`} type="audio/mpeg" />
      </audio>
      <audio ref={ttsRef} hidden />

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
              background:
                i === currentIndex
                  ? "yellow"
                  : i === popup.index
                  ? "lightblue"
                  : "transparent",
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
            minWidth: 320,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            zIndex: 9999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>הצעות</strong>
            <button onClick={() => closePopup(true)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
          </div>

          {popup.loading && <div>טוען...</div>}
          {popup.error && <div style={{ color: "crimson" }}>שגיאה: {popup.error}</div>}

          {!popup.loading && !popup.error && (
            <>
              {popup.suggestions.length === 0 ? (
                <div>אין הצעות</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {popup.suggestions.map((s, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
                      <button
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
                        {s.word} {s.isRecommended ? "⭐" : ""}{s.isOriginal ? " (מקורי)" : ""}
                      </button>
                      <button
                        onClick={() => handleTranslate(s.word)}
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "green",
                          marginLeft: 10,
                        }}
                      >
                        תרגום
                      </button>
                      {translations[s.word] && (
                        <span style={{ fontSize: 14, color: "gray", marginLeft: 10 }}>
                          {translations[s.word]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 10 }}>
            <textarea
              rows={2}
              placeholder="שאל שאלה חופשית..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ width: "100%", resize: "none", borderRadius: 6, border: "1px solid #ddd", padding: 6 }}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading}
              style={{
                marginTop: 6,
                width: "100%",
                padding: "6px",
                borderRadius: 6,
                border: "none",
                background: "#007bff",
                color: "white",
                cursor: "pointer",
              }}
            >
              {chatLoading ? "שולח..." : "שלח"}
            </button>
            {chatError && <div style={{ color: "red" }}>{chatError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
