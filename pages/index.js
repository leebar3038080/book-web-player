import { useEffect, useState } from "react";
import chapterOne from "../data/chapter_one_shimmer.json";

export default function Home() {
  const [text, setText] = useState("");

  useEffect(() => {
    // נטען את הטקסט של הפרק הראשון מהקובץ JSON
    if (chapterOne && chapterOne.chapters && chapterOne.chapters.length > 0) {
      setText(chapterOne.chapters[0].text);
    }
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", direction: "rtl" }}>
      <h1>📖 פרק ראשון</h1>
      <p style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>{text}</p>

      <h2>🔊 קריינות</h2>
      <audio controls style={{ width: "100%" }}>
        <source src="/api/tts?chapter=1" type="audio/mpeg" />
        הדפדפן שלך לא תומך בנגן אודיו
      </audio>
    </div>
  );
}
