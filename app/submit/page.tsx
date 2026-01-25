"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * ✅ このページは「未ログインでも投稿申請できる」想定
 * - genres / genre_categories を読み込み
 * - カテゴリタブで絞り込み表示
 * - ジャンル複数選択
 * - videos に INSERT（status='pending' 固定）
 *
 * ※ あなたのDBカラム名に合わせて下の INSERT 部分だけ微調整してね
 */

// Supabase client（クライアント側：NEXT_PUBLIC を使う）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ===== Types（必要最低限）=====
type GenreCategory = {
  id: number;
  name: string;
  sort_order: number | null;
};

type Genre = {
  id: number;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  // ✅ ここがポイント：ジャンル→カテゴリの外部キー
  genre_category_id: number | null;
};

export default function SubmitPage() {
  // 入力フォーム
  const [creatorName, setCreatorName] = useState("@test_creator2");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [memo, setMemo] = useState("");

  // カテゴリ/ジャンル
  const [categories, setCategories] = useState<GenreCategory[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  // ジャンル選択（Setで管理）
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(new Set());

  // メッセージ
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // YouTube URL → embed URL 変換
  const toYoutubeEmbed = (u: string) => {
    if (!u) return u;

    // youtu.be/xxxxx
    const m1 = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m1?.[1]) return `https://www.youtube.com/embed/${m1[1]}?autoplay=0&mute=0`;

    // youtube.com/watch?v=xxxxx or ?v=xxxxx
    const m2 = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m2?.[1]) return `https://www.youtube.com/embed/${m2[1]}?autoplay=0&mute=0`;

    // すでに embed っぽい
    if (u.includes("youtube.com/embed/")) return u;

    return u;
  };

  // 初期ロード：カテゴリ & ジャンル
  useEffect(() => {
    const load = async () => {
      setMsg(null);

      // カテゴリ取得
      const catRes = await supabase
        .from("genre_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catRes.error) {
        setMsg(`カテゴリ取得エラー：${catRes.error.message}`);
        return;
      }

      const cats = (catRes.data ?? []) as GenreCategory[];
      setCategories(cats);
      setActiveCatId(cats[0]?.id ?? null);

      // ジャンル取得（activeのみ）
      const genRes = await supabase
        .from("genres")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (genRes.error) {
        setMsg(`ジャンル取得エラー：${genRes.error.message}`);
        return;
      }

      const gs = (genRes.data ?? []) as Genre[];
      setGenres(gs);

      // デバッグしたい時はこれ
      // console.log("genre sample:", gs[0]);
    };

    load();
  }, []);

  // アクティブカテゴリのジャンルだけ表示（✅ここが修正済み）
  const visibleGenres = useMemo(() => {
    if (!activeCatId) return [];
    return genres.filter((g) => String(g.genre_category_id) === String(activeCatId));
  }, [genres, activeCatId]);

  // 選択されているジャンル名一覧（プレビュー用）
  const selectedNames = useMemo(() => {
    const map = new Map(genres.map((g) => [g.id, g.name]));
    return Array.from(selectedGenreIds)
      .map((id) => map.get(id))
      .filter(Boolean) as string[];
  }, [selectedGenreIds, genres]);

  // チップON/OFF
  const toggleGenre = (id: number) => {
    setSelectedGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelected = () => setSelectedGenreIds(new Set());

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // ✅ ここで「呼ばれてるか」確認したい時はON
    // console.log("handleSubmit called");

    const cn = creatorName.trim();
    const tt = title.trim();
    const vu = videoUrl.trim();

    // 必須チェック（必要なら条件を変えてOK）
    if (!cn) return setMsg("クリエイター名（必須）を入力してください。");
    if (!tt) return setMsg("動画タイトル（必須）を入力してください。");
    if (!vu) return setMsg("動画URL（必須）を入力してください。");

    const embedUrl = toYoutubeEmbed(vu);

    setSending(true);
    try {
      /**
       * ✅ 重要：RLSで WITH CHECK (status='pending') を入れたので
       * INSERT に必ず status: 'pending' を含める
       *
       * ※ 下のカラム名はあなたの videos テーブルに合わせて調整してね
       * 例：creator_name / creator / creator_handle など
       */
      const insertPayload: any = {
        creator_name: cn, // ← videos のカラム名に合わせる
        email: email.trim() || null, // 任意
        title: tt,
        video_url: vu,
        embed_url: embedUrl,
        memo: memo.trim() || null,
        status: "pending", // ✅これが無いとRLSで落ちる
      };

      const ins = await supabase.from("videos").insert(insertPayload).select("id").single();

      if (ins.error) {
        // ここが例の「new row violates row-level security policy ...」になる場所
        setMsg(`送信に失敗しました：${ins.error.message}`);
        return;
      }

      const videoId = ins.data?.id;

      /**
       * ✅ もし中間テーブルで genres を紐づけてるならここでINSERT
       * - テーブル名が違うなら変更（例: video_genres / videos_genres / video_genre_links）
       * - カラム名も合わせる（video_id, genre_id）
       *
       * 中間テーブルが無い運用なら、このブロックは丸ごと削除してOK
       */
      if (videoId && selectedGenreIds.size > 0) {
        const rows = Array.from(selectedGenreIds).map((gid) => ({
          video_id: videoId,
          genre_id: gid,
        }));

        const linkRes = await supabase.from("video_genres").insert(rows);
        if (linkRes.error) {
          // videos は作れてるので致命的ではないが、紐づけが失敗
          setMsg(
            `申請は作成できましたが、ジャンル紐づけに失敗しました：${linkRes.error.message}`
          );
          return;
        }
      }

      setMsg("申請を送信しました！管理者の承認をお待ちください。");

      // 送信後の初期化（必要なら調整）
      setTitle("");
      setVideoUrl("");
      setMemo("");
      clearSelected();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>クリエイター動画申請フォーム</h1>
        <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          Echi.tok に掲載したいサンプル動画の情報を入力してください。管理者が内容を確認し、承認された動画のみ公開されます。
        </p>

        <form onSubmit={handleSubmit}>
          {/* クリエイター名 */}
          <label style={{ display: "block", marginBottom: 6 }}>クリエイター名（必須）</label>
          <input
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            style={inputStyle}
            placeholder="@creator"
          />

          {/* メール */}
          <label style={{ display: "block", margin: "14px 0 6px" }}>メールアドレス（任意）</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="example@mail.com"
          />

          {/* タイトル */}
          <label style={{ display: "block", margin: "14px 0 6px" }}>動画タイトル（必須）</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="タイトル"
          />

          {/* ジャンル */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
            <label style={{ display: "block", marginBottom: 6 }}>ジャンル（複数選択OK）</label>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>選択中：{selectedGenreIds.size}件</div>
          </div>

          {/* カテゴリタブ */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
            {categories.map((c) => {
              const active = c.id === activeCatId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCatId(c.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: active ? "1px solid rgba(0,200,83,0.9)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(0,200,83,0.18)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* ジャンルチップ */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {visibleGenres.map((g) => {
              const active = selectedGenreIds.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: active ? "1px solid rgba(0,200,83,0.9)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(0,200,83,0.18)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: active ? "bold" : "normal",
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {/* プレビュー（任意） */}
          {selectedNames.length > 0 && (
            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
              選択中：{selectedNames.join(" / ")}
            </div>
          )}

          {/* 動画URL */}
          <label style={{ display: "block", margin: "16px 0 6px" }}>動画URL（必須：YouTube等）</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            style={inputStyle}
            placeholder="https://youtu.be/..."
          />
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
            通常の YouTube URL でもOK（自動で embed 形式へ変換します）
          </div>

          {/* メモ */}
          <label style={{ display: "block", margin: "14px 0 6px" }}>メモ（管理者向け・任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ ...inputStyle, height: 120, resize: "vertical" }}
            placeholder="本編URLや切り抜き箇所など（※いまはDB保存します。保存したくないなら言って！）"
          />

          {/* メッセージ */}
          {msg && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                border: "1px solid rgba(255,80,80,0.35)",
                background: "rgba(255,0,0,0.12)",
                color: "#fff",
              }}
            >
              {msg}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={sending}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "14px 12px",
              borderRadius: 12,
              border: "none",
              background: sending ? "rgba(0,200,83,0.35)" : "rgba(0,200,83,0.95)",
              color: "#000",
              fontWeight: 800,
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "送信中..." : "申請を送信する"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 共通 input style
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  outline: "none",
};
