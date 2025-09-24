import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const audioRef = useRef(null);

  useEffect(() => {
    // טוען את ה-JSON עם הסגמנטים והמילים
    fetch("/chapter_one_shimmer.json")
      .then((res) => res.json())
      .then((data) => {
        const wordsData = [];
        data.segments.forEach((seg) => {
          seg.words.forEach((w) => wordsData.push(w));
        });
        setWords(wordsData);
        setAudioUrl("/api/tts");
      });
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // שומר על הפיטצ'
      audioRef.current.preservesPitch = true;
      audioRef.current.mozPreservesPitch = true;
      audioRef.current.webkitPreservesPitch = true;

      audio.playbackRate = playbackRate;
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
      });

      // עדכון מרקר לפי הזמן
      audio.addEventListener("timeupdate", () => {
        const t = audio.currentTime;
        const idx = words.findIndex(
          (w) => t >= w.start && t <= w.end
        );
        if (idx !== -1 && idx !== currentWordIndex) {
          setCurrentWordIndex(idx);
        }
      });

      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>WhisperX Web Player</h1>

      {/* טקסט מסונכרן */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
          lineHeight: "1.6",
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === currentWordIndex ? "yellow" : "transparent",
              marginRight: "3px",
            }}
          >
            {w.word}
          </span>
        ))}
      </div>

      {/* כפתורי שליטה */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button onClick={togglePlay}>
          {isPlaying ? "⏸ עצור" : "▶️ נגן"}
        </button>

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
          onClick={() => changeSpeed(1.0)}
          style={{ fontWeight: playbackRate === 1.0 ? "bold" : "normal" }}
        >
          1×
        </button>
      </div>
    </div>
  );
}
