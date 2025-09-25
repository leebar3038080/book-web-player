// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef(null);
  const wordRefs = useRef([]);
  const [originalWords, setOriginalWords] = useState({});

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

  function getContext(index) {
    const spanBack = 40;
    const spanForward = 20;
    const start = Math.max(0, index - spanBack);
    const end = Math.min(words.length, index + spanForward + 1);
    return words.slice(start, end).map((w) => w.text).join(" ");
  }

  async function handleWordClick(e, index) {
    if (audioRef.current) audioRef.current.pause();

    const rect = e.target.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY + rect.height + 6;

    const target = words[index]?.text;
    const context = getContext(index);

    if (!originalWords[index]) {
      setOriginalWords((prev) => ({ ...prev, [index]: target }));
    }

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

      let suggestions = data?.suggestions || [];
      const originalWord = originalWords[index];
      if (originalWord && originalWord !== target) {
        suggestions = [{ word: originalWord, isOriginal: true }, ...suggestions];
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

  function applySuggestion(word, isOriginal = false) {
    if (popup.index == null) return;
    const next = [...words];
    next[popup.index] = { ...next[popup.index], text: word };
    setWords(next);

    if (isOriginal) {
      delete originalWords[popup.index];
      setOriginalWords({ ...originalWords });
    }

    closePopup();
  }

  function closePopup() {
    setPopup((p) => ({ ...p, visible: false }));
    if (audioRef.current) audioRef.current.play();
  }

  function handleWordRightClick(e, index) {
    e.preventDefault();
    if (!audioRef.current) return;
    audioRef.current.currentTime = words[index].start;
    audioRef.current.play();
  }

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6 text-indigo-700">
        WhisperX Web Player
      </h1>

      <audio ref={audioRef} hidden>
        <source src="/chapter_one_shimmer.mp3" type="audio/mpeg" />
      </audio>

      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={handlePlay}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow"
        >
          ▶ Play
        </button>
        <button
          onClick={handlePause}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow"
        >
          ⏸ Pause
        </button>
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow"
        >
          ⏹ Stop
        </button>
        <button
          onClick={handleSlower}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow"
        >
          ⏪ Slower
        </button>
        <button
          onClick={handleFaster}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow"
        >
          ⏩ Faster
        </button>
        <span className="ml-4 text-lg text-gray-700">
          Speed: {speed.toFixed(1)}x
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow p-6 leading-8 text-lg">
        {words.map((w, i) => (
          <span
            key={i}
            ref={(el) => (wordRefs.current[i] = el)}
            onClick={(e) => handleWordClick(e, i)}
            onContextMenu={(e) => handleWordRightClick(e, i)}
            className={`
              cursor-pointer px-1 rounded 
              ${i === currentIndex ? "bg-yellow-200" : ""}
              ${originalWords[i] ? "text-blue-600 font-semibold" : ""}
            `}
          >
            {w.text}
          </span>
        ))}
      </div>

      {popup.visible && (
        <div
          className="absolute bg-white/90 backdrop-blur border border-gray-300 rounded-lg shadow-lg p-4 z-50"
          style={{ left: popup.x, top: popup.y, minWidth: 250 }}
        >
          <div className="flex justify-between items-center mb-2">
            <strong className="text-gray-700">הצעות</strong>
            <button
              onClick={closePopup}
              className="text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          {popup.loading && <div>טוען...</div>}
          {popup.error && (
            <div className="text-red-500">שגיאה: {popup.error}</div>
          )}

          {!popup.loading && !popup.error && (
            <>
              {popup.suggestions.length === 0 ? (
                <div>אין הצעות</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {popup.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(s.word, s.isOriginal)}
                      className={`px-3 py-2 rounded border text-left ${
                        s.isOriginal
                          ? "bg-gray-200 text-gray-700"
                          : "bg-indigo-50 hover:bg-indigo-100 border-gray-300"
                      }`}
                    >
                      {s.word} {s.isOriginal ? "(מקורית)" : ""}
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
