// pages/api/changes.js
import fetch from "node-fetch";

const owner = "leebar3038080";       // עדכן לפי המשתמש שלך בגיטהאב
const repo = "book-web-player";     // שם הריפו
const path = "public/books/changes.json"; // איפה שמור הקובץ
const branch = "main";              // ברירת מחדל: main

async function getFileSha() {
  const resp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) return null; // קובץ עוד לא קיים
    throw new Error("GitHub API error (getFileSha)");
  }
  const data = await resp.json();
  return data.sha;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (resp.status === 404) {
        return res.status(200).json({ changes: [] });
      }

      if (!resp.ok) throw new Error("GitHub API error (GET)");

      const data = await resp.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const json = JSON.parse(content);

      return res.status(200).json({ changes: json });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { chapter, index, original, newWord } = req.body;
      if (!chapter || index == null || !original || !newWord) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // קריאת הקובץ הקיים (או יצירת חדש)
      let current = [];
      let sha = null;

      const resp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        sha = data.sha;
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        current = JSON.parse(content);
      }

      // הוספת שינוי חדש
      current.push({ chapter, index, original, newWord, time: Date.now() });

      // כתיבה חזרה לגיטהאב
      const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString(
        "base64"
      );

      const putResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: `Update changes.json (chapter ${chapter}, index ${index})`,
            content: newContent,
            sha: sha || undefined,
            branch,
          }),
        }
      );

      if (!putResp.ok) {
        const errData = await putResp.json();
        throw new Error("GitHub API error (PUT): " + JSON.stringify(errData));
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
