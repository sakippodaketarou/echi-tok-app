"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Video = {
  id: string;
  creator_name: string;
  creator_email: string | null;
  title: string;
  genre: string | null;
  video_url: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // ここはあなたが以前設定した “管理者パスワード” に合わせます
  // Vercel の環境変数 ADMIN_PASSWORD を使っている場合は、次の1行でOK
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

  const login = () => {
    // もし環境変数で管理していない場合は、ここに直書きでもOK
    // const ADMIN_PASSWORD = "あなたの管理者パスワード";
    if (!ADMIN_PASSWORD) {
      alert(
        "管理者パスワード(環境変数 NEXT_PUBLIC_ADMIN_PASSWORD) が未設定です。"
      );
      return;
    }
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      alert("パスワードが違います。");
    }
  };

  const loadPending = async () => {
    setLoading(true);
    setErrorText(null);

    // 接続先が正しいか確認するため、URL も表示できるようにする
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        setErrorText(
          `Supabaseエラー: ${error.message}\n(code: ${error.code ?? "n/a"})\nurl: ${
            supabaseUrl ?? "undefined"
          }`
        );
        setVideos([]);
      } else {
        setVideos((data ?? []) as Video[]);
      }
    } catch (e: any) {
      console.error("Fetch failed:", e);
      setErrorText(`Fetch失敗: ${String(e?.message ?? e)}\nurl: ${supabaseUrl}`);
      setVideos([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authed) {
      loadPending();
    }
  }, [authed]);

  if (!authed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(420px, 92vw)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h1 style={{ margin: "0 0 10px 0", fontSize: 18 }}>管理者ログイン</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理者パスワード"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              outline: "none",
            }}
          />
          <button
            onClick={login}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "#00c853",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ログイン
          </button>
          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            ※この画面はデバッグ用に差し替えています
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "20px 16px",
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: "bold" }}>
          管理画面：承認待ち動画（pending）
        </h1>
        <p style={{ margin: "8px 0 0 0", opacity: 0.8, fontSize: 13 }}>
          pending の動画だけ表示します
        </p>
      </header>

      {errorText && (
        <div
          style={{
            background: "rgba(255,0,0,0.15)",
            border: "1px solid rgba(255,0,0,0.45)",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {errorText}
        </div>
      )}

      <button
        onClick={loadPending}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        再読み込み
      </button>

      {loading && <p style={{ opacity: 0.8 }}>読み込み中…</p>}

      {!loading && videos.length === 0 && !errorText && (
        <p style={{ opacity: 0.8 }}>承認待ち動画はありません。</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {videos.map((v) => (
          <div
            key={v.id}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{v.title}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              @{v.creator_name} / {v.genre ?? "-"} / status: {v.status}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              id: {v.id}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
