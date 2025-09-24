import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef(null);

  useEffect(() => {
    // טוען JSON ומוציא מתוכו את כל המילים
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const allWords = [];
        if (data.segments) {
          data.segments.forEach((seg) => {
            if (seg.words) {
              seg.words.forEach((w) => allWords.push(w));
            }
          });
        }
        setWords(allWords);
      });
  }, []);

  // בכל שינוי זמן באודיו → מחשב איזו מילה להדגיש
  const handleTimeUpdate = () => {
    if (!audioRef.current || words.length === 0) return;

    const currentTime = audioRef.current.currentTime;
    let wordIndex = -1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (currentTime >= w.start && currentTime <= w.end) {
        wordIndex = i;
        break;
      }
    }
    setCurrentWordIndex(wordIndex);
  };

  // שינוי מהירות (בלי פגיעה בפיץ')
  const changeSpeed = (rate) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.preservesPitch = true;
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
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === currentWordIndex ? "yellow" : "transparent",
            }}
          >
            {w.word + " "}
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
