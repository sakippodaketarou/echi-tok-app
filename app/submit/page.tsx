"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SubmitPage() {
  const [creatorName, setCreatorName] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    // 簡単なバリデーション
    if (!creatorName || !title || !videoUrl) {
      setErrorMessage("クリエイター名・タイトル・動画URLは必須です。");
      return;
    }

    setSending(true);

    // Supabase の videos テーブルに status='pending' で登録
    const { error } = await supabase.from("videos").insert({
      creator_name: creatorName,
      creator_email: email || null,
      title,
      genre: genre || null,
      video_url: videoUrl,
      status: "pending",
      // メモ用に別テーブルを作ってもいいですが、まずは genre に書くなどでもOK
    });

    setSending(false);

    if (error) {
      console.error(error);
      setErrorMessage("送信に失敗しました：" + error.message);
    } else {
      setMessage("申請を受け付けました！審査完了までお待ちください。");
      // 入力内容をクリア
      setCreatorName("");
      setTitle("");
      setGenre("");
      setVideoUrl("");
      setEmail("");
      setMemo("");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#111",
          borderRadius: "16px",
          padding: "24px 20px",
          border: "1px solid #222",
        }}
      >
        <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>
          クリエイター動画申請フォーム
        </h1>
        <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "20px" }}>
          Echi.tok に掲載したいサンプル動画の情報を入力してください。
          管理者が内容を確認し、承認された動画のみ公開されます。
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* クリエイター名 */}
          <div>
            <label
              htmlFor="creator"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              クリエイター名（必須）
            </label>
            <input
              id="creator"
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="@sample_creator"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
                fontSize: "14px",
              }}
            />
          </div>
          {/* メールアドレス（任意） */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              メールアドレス（任意）
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
              }}
            />
           </div>

          {/* タイトル */}
          <div>
            <label
              htmlFor="title"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              動画タイトル（必須）
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：真夏のドライブデート【サンプル】"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
                fontSize: "14px",
              }}
            />
          </div>

          {/* ジャンル */}
          <div>
            <label
              htmlFor="genre"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              ジャンル（任意）
            </label>
            <input
              id="genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="例：素人 / カップル / 旅行 など"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
                fontSize: "14px",
              }}
            />
          </div>

          {/* 動画URL */}
          <div>
            <label
              htmlFor="videoUrl"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              動画URL（必須・YouTube等の埋め込みURL）
            </label>
            <input
              id="videoUrl"
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/XXXXXX?autoplay=1&mute=1"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <p style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
              通常の YouTube URL
              （例：https://www.youtube.com/watch?v=XXXX）
              を、embed 形式
              （https://www.youtube.com/embed/XXXX?autoplay=1&mute=1）
              に変換して入力してください。
            </p>
          </div>

          {/* メモ（管理者向け） */}
          <div>
            <label
              htmlFor="memo"
              style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}
            >
              メモ（管理者向け・任意）
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="本編URLや、どの部分を切り抜いた動画か、注意してほしい点などがあれば記載してください。（※ 今はDBには保存されませんが、後でメモ用カラムを追加できます）"
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#000",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          {/* エラー / 成功メッセージ */}
          {errorMessage && (
            <p style={{ color: "#ff5252", fontSize: "12px" }}>{errorMessage}</p>
          )}
          {message && (
            <p style={{ color: "#00e676", fontSize: "12px" }}>{message}</p>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={sending}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: sending ? "#555" : "#00c853",
              color: "#000",
              cursor: sending ? "default" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {sending ? "送信中..." : "申請を送信する"}
          </button>
        </form>
      </div>
    </main>
  );
}
