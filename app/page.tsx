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

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorText(null);

      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        setErrorText(
          `Supabaseエラー: ${error.message}\n(code: ${error.code ?? "n/a"})`
        );
        setVideos([]);
      } else {
        setVideos((data ?? []) as Video[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))",
          zIndex: 1000,
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
          Echi.tok
        </h1>
        <span style={{ fontSize: "12px", opacity: 0.8, marginLeft: "8px" }}>
          承認済みサンプル動画フィード
        </span>
      </header>

      {/* ★エラー表示（原因特定用） */}
      {errorText && (
        <div
          style={{
            position: "fixed",
            top: 62,
            left: 16,
            right: 16,
            zIndex: 2000,
            background: "rgba(255,0,0,0.15)",
            border: "1px solid rgba(255,0,0,0.45)",
            padding: "12px",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
            fontSize: "12px",
          }}
        >
          {errorText}
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            （この赤い表示は原因特定のための一時表示です）
          </div>
        </div>
      )}

      {/* 縦方向に1画面ずつスクロール */}
      <div
        style={{
          position: "relative",
          height: "100vh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
      >
        {/* ローディング */}
        {loading && (
          <section
            style={{
              height: "100vh",
              scrollSnapAlign: "start",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              opacity: 0.8,
            }}
          >
            読み込み中です…
          </section>
        )}

        {/* 動画がない場合 */}
        {!loading && videos.length === 0 && !errorText && (
          <section
            style={{
              height: "100vh",
              scrollSnapAlign: "start",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              opacity: 0.85,
              padding: "0 24px",
              textAlign: "center",
            }}
          >
            <p style={{ marginBottom: "8px" }}>まだ承認済み動画がありません。</p>
            <p style={{ fontSize: "13px", opacity: 0.7 }}>
              クリエイターからの申請を承認すると、ここに表示されます。
            </p>
          </section>
        )}

        {/* 承認済み動画を表示 */}
        {videos.map((video, index) => (
          <section
            key={video.id}
            style={{
              position: "relative",
              height: "100vh",
              scrollSnapAlign: "start",
              background: "#000",
            }}
          >
            <iframe
              src={video.video_url}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={video.title}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px",
                background:
                  "linear-gradient(transparent, rgba(0,0,0,0.9))",
              }}
            >
              <p style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                {video.title}
              </p>
              <p style={{ fontSize: "13px", margin: 0, opacity: 0.9 }}>
                @{video.creator_name}
                {video.genre ? ` ｜ ジャンル：${video.genre}` : ""}
              </p>
              <p style={{ fontSize: "11px", margin: "6px 0 0 0", opacity: 0.7 }}>
                slide {index + 1} / {videos.length}
              </p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
