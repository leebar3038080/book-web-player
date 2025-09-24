import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [segments, setSegments] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef(null);

  useEffect(() => {
    // טוען את הטקסט מתוך JSON
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        setSegments(data.segments || []);
      });
  }, []);

  // בכל שינוי זמן באודיו → מחשב איזו מילה צריכה להיות מודגשת
  const handleTimeUpdate = () => {
    if (!audioRef.current || segments.length === 0) return;

    const currentTime = audioRef.current.currentTime;
    let wordIndex = -1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (currentTime >= seg.start && currentTime <= seg.end) {
        wordIndex = i;
        break;
      }
    }
    setCurrentWordIndex(wordIndex);
  };

  // שינוי מהירות (בלי שינוי pitch)
  const changeSpeed = (rate) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.preservesPitch = true; // חשוב – שומר על pitch
      setPlaybackRate(rate);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>WhisperX Web Player</h1>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          lineHeight: "1.8",
          fontSize: "18px",
        }}
      >
        {segments.map((seg, i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === currentWordIndex ? "yellow" : "transparent",
            }}
          >
            {seg.text + " "}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => audioRef.current.play()}>▶️ הפעל</button>
        <button onClick={() => audioRef.current.pause()}>⏸ עצור</button>

        <button onClick={() => changeSpeed(0.8)}>0.8x</button>
        <button onClick={() => changeSpeed(0.9)}>0.9x</button>
        <button onClick={() => changeSpeed(1.0)}>1x</button>
      </div>

      {/* נגן מוסתר */}
      <audio
        ref={audioRef}
        src="/chapter_one_shimmer.mp3"
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}
