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

const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "echi-tok-admin";

export default function AdminPage() {
  // 認証まわり
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // 動画データ
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // すでにログイン済みか（localStorage）を確認
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = window.localStorage.getItem("echi_admin_authed");
    if (flag === "1") {
      setAuthorized(true);
    }
  }, []);

  // 承認待ち動画の取得
  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
    } else {
      setVideos((data ?? []) as Video[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authorized) return;
    setLoading(true);
    loadVideos();
  }, [authorized]);

  // ログイン処理
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthorized(true);
      setAuthError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("echi_admin_authed", "1");
      }
    } else {
      setAuthError("パスワードが違います。");
    }
  };

  // ログアウト
  const handleLogout = () => {
    setAuthorized(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("echi_admin_authed");
    }
  };

  // 承認処理
  const approveVideo = async (id: string) => {
    await supabase
      .from("videos")
      .update({ status: "approved", rejection_reason: null })
      .eq("id", id);

    loadVideos();
  };

  // 拒否処理（理由つき）
  const rejectVideo = async (video: Video) => {
    let reason = "";

    if (typeof window !== "undefined") {
      const input = window.prompt(
        "拒否理由を入力してください（クリエイターにも通知されます）：",
        video.rejection_reason || ""
      );
      reason = input ?? "";
    }

    await supabase
      .from("videos")
      .update({
        status: "rejected",
        rejection_reason: reason === "" ? null : reason,
      })
      .eq("id", video.id);

    loadVideos();
  };

  // ====== UI ======

  // 未ログイン時：パスワード入力画面
  if (!authorized) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            background: "#222",
            padding: "24px 28px",
            borderRadius: "12px",
            border: "1px solid #333",
            width: "320px",
          }}
        >
          <h1 style={{ fontSize: "20px", marginBottom: "16px" }}>
            管理者ログイン
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "12px" }}>
            管理者パスワードを入力してください。
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="パスワード"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #555",
                marginBottom: "12px",
                background: "#111",
                color: "#fff",
              }}
            />
            {authError && (
              <p style={{ color: "#ff5252", fontSize: "12px", marginBottom: 8 }}>
                {authError}
              </p>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                background: "#00c853",
                cursor: "pointer",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              ログイン
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ログイン済み：承認待ち動画一覧
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
        padding: "24px",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "28px" }}>管理画面：承認待ち動画</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #555",
            background: "#222",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          ログアウト
        </button>
      </div>

      {loading && <p>読み込み中です...</p>}

      {!loading && videos.length === 0 && (
        <p style={{ opacity: 0.8 }}>承認待ち動画はありません。</p>
      )}

      {errorMessage && (
        <p style={{ color: "#ff5252" }}>エラー：{errorMessage}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {videos.map((video) => (
          <section
            key={video.id}
            style={{
              background: "#222",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #333",
            }}
          >
            <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
              {video.title}
            </h2>

            <div style={{ position: "relative", paddingTop: "56.25%" }}>
              <iframe
                src={video.video_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              ></iframe>
            </div>

            <div style={{ marginTop: "12px", fontSize: "14px" }}>
              <p>クリエイター：{video.creator_name}</p>
              {video.creator_email && (
                <p style={{ opacity: 0.85 }}>
                  メール：{video.creator_email}
                </p>
              )}
              <p style={{ opacity: 0.8, marginTop: "4px" }}>
                ジャンル：{video.genre ?? "未設定"} / status: {video.status}
              </p>
              {video.rejection_reason && (
                <p
                  style={{
                    opacity: 0.8,
                    marginTop: "4px",
                    color: "#ffab40",
                    fontSize: "13px",
                  }}
                >
                  過去の拒否理由：{video.rejection_reason}
                </p>
              )}
            </div>

            <div style={{ marginTop: "16px", display: "flex", gap: "16px" }}>
              <button
                onClick={() => approveVideo(video.id)}
                style={{
                  padding: "10px 16px",
                  background: "#00c853",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#000",
                  fontWeight: "bold",
                }}
              >
                ✔ 承認する
              </button>

              <button
                onClick={() => rejectVideo(video)}
                style={{
                  padding: "10px 16px",
                  background: "#ff5252",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                ✖ 拒否する
              </button>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
