import { useEffect, useRef, useState } from "react";

const EPS = 0.06; // 60ms טולרנס קטן נגד חורים/עיגולים

export default function Home() {
  const [displayWords, setDisplayWords] = useState([]);   // כל המילים (גם בלי זמנים)
  const [timedWords, setTimedWords] = useState([]);       // רק מילים עם start/end
  const [timedIdxToDisplayIdx, setMap] = useState([]);    // מיפוי: אינדקס במתוזמנות -> אינדקס בתצוגה
  const [currentDisplayIdx, setCurrentDisplayIdx] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimedIdxRef = useRef(-1);
  const wordRefs = useRef([]);

  useEffect(() => {
    // טוען את ה־JSON ומכין רשימות
    fetch("/chapter_one_shimmer.json")
      .then((r) => r.json())
      .then((data) => {
        const all = [];
        const timed = [];
        const map = [];

        if (Array.isArray(data.segments)) {
          data.segments.forEach((seg) => {
            (seg.words || []).forEach((w) => {
              const start = typeof w.start === "number" ? w.start : null;
              const end   = typeof w.end   === "number" ? w.end   : null;

              const displayIdx = all.length;
              all.push({ text: w.word, start, end });

              if (start !== null && end !== null && end > start) {
                map.push(displayIdx);
                timed.push({ text: w.word, start, end });
              }
            });
          });
        }

        setDisplayWords(all);
        setTimedWords(timed);
        setMap(map);
      });
  }, []);

  // לולאת רענון מדויקת עם requestAnimationFrame
  const tick = () => {
    const audio = audioRef.current;
    if (!audio || timedWords.length === 0) return;

    const t = audio.currentTime;

    // אם אין אינדקס פעיל או שדילגנו הרבה (seek), חפש בינארית את המילה המתאימה
    const lastTimed = lastTimedIdxRef.value ?? lastTimedIdxRef.current;
    if (
      lastTimed < 0 ||
      t < timedWords[lastTimed].start - EPS ||
      t > timedWords[lastTimed].end + EPS
    ) {
      let lo = 0,
        hi = timedWords.length - 1,
        found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const w = timedWords[mid];
        if (t < w.start - EPS) hi = mid - 1;
        else if (t > w.end + EPS) lo = mid + 1;
        else {
          found = mid;
          break;
        }
      }
      lastTimedIdxRef.current = found;
    } else {
      // אחרת, התקדם קדימה אם עברנו את סוף המילה
      let i = lastTimedIdxRef.current;
      while (
        i + 1 < timedWords.length &&
        t >= timedWords[i + 1].start - EPS
      ) {
        i++;
      }
      lastTimedIdxRef.current = i;
    }

    const activeTimedIdx = lastTimedIdxRef.current;
    const displayIdx =
      activeTimedIdx >= 0 ? timedIdxToDisplayIdx[activeTimedIdx] : -1;
    if (displayIdx !== currentDisplayIdx) {
      setCurrentDisplayIdx(displayIdx);
      // גלילה נעימה למילה הפעילה
      const el = wordRefs.current[displayIdx];
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const startRaf = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };
  const stopRaf = () => cancelAnimationFrame(rafRef.current);

  const handlePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    // שמירה על גובה הקול בעת שינוי מהירות
    a.preservesPitch = true;
    a.mozPreservesPitch = true;
    a.webkitPreservesPitch = true;
    a.playbackRate = playbackRate;
    a.play();
    startRaf();
  };

  const handlePause = () => {
    audioRef.current?.pause();
    stopRaf();
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.preservesPitch = true;
    }
  };

  // כשגוללים/מדלגים בזמן – סנכרון מיידי
  const handleSeeked = () => {
    lastTimedIdxRef.current = -1; // הכריח חיפוש מחדש
  };
  const handleEnded = () => {
    stopRaf();
    setCurrentDisplayIdx(-1);
    lastTimedIdxRef.current = -1;
  };

  return (
    <div style={{ padding: "28px", maxWidth: 1100 }}>
      <h1>WhisperX Web Player</h1>

      <div
        style={{
          border: "1px solid #ddd",
          padding: "16px",
          lineHeight: 1.8,
          fontSize: 18,
          borderRadius: 8,
          maxHeight: 300,
          overflowY: "auto",
          scrollBehavior: "smooth",
        }}
      >
        {displayWords.map((w, i) => (
          <span
            key={i}
            ref={(el) => (wordRefs.current[i] = el)}
            style={{
              background:
                i === currentDisplayIdx ? "yellow" : "transparent",
              marginRight: 4,
              borderRadius: 4,
            }}
          >
            {w.text}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={handlePlay}>▶️ נגן</button>
        <button onClick={handlePause}>⏸ עצור</button>

        <button
          onClick={() => changeSpeed(0.8)}
          style={{ fontWeight: playbackRate === 0.8 ? "bold" : "normal" }}
        >
          0.8×
        </button>
        <button
          onClick={() => changeSpeed(0.9)}
          style={{ fontWeight: playbackRate === 0.9 ? "bold" : "normal" }}
        >
          0.9×
        </button>
        <button
          onClick={() => changeSpeed(1)}
          style={{ fontWeight: playbackRate === 1 ? "bold" : "normal" }}
        >
          1×
        </button>
      </div>

      {/* נגן (מוסתר) */}
      <audio
        ref={audioRef}
        src="/chapter_one_shimmer.mp3"
        onSeeked={handleSeeked}
        onEnded={handleEnded}
        onPause={stopRaf}
      />
    </div>
  );
}
