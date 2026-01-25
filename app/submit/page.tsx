"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GenreCategory = {
  id: number;
  slug: string;
  name: string;
  sort_order: number | null;
};

type Genre = {
  id: number;
  category_id: number;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number | null;
};

export default function SubmitPage() {
  // フォーム
  const [creatorName, setCreatorName] = useState("@test_creator2");
  const [creatorEmail, setCreatorEmail] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // ジャンル（DBから取得）
  const [categories, setCategories] = useState<GenreCategory[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  // 選択中ジャンル（複数）
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(
    () => new Set()
  );

  // UI状態
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // YouTube通常URL → embed変換（入力補助）
  const toYouTubeEmbed = (url: string) => {
    const u = url.trim();

    if (u.includes("youtube.com/embed/")) return u;

    const m1 = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m1?.[1]) {
      return `https://www.youtube.com/embed/${m1[1]}?autoplay=1&mute=1`;
    }

    const m2 = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m2?.[1]) {
      return `https://www.youtube.com/embed/${m2[1]}?autoplay=1&mute=1`;
    }

    return u;
  };

  // ① カテゴリ＋ジャンルをDBから読み込み
  useEffect(() => {
    const load = async () => {
      setMsg(null);

      // カテゴリ取得
      const catRes = await supabase
        .from("genre_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catRes.error) {
        setMsg(`カテゴリ取得エラー: ${catRes.error.message}`);
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
        setMsg(`ジャンル取得エラー: ${genRes.error.message}`);
        return;
      }

      setGenres((genRes.data ?? []) as Genre[]);
    };

    load();
  }, []);

  // アクティブカテゴリのジャンルだけ表示
  const visibleGenres = useMemo(() => {
    if (!activeCatId) return [];
    return genres.filter((g) => g.category_id === activeCatId);
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

    const cn = creatorName.trim();
    const t = title.trim();
    const v = toYouTubeEmbed(videoUrl);

    if (!cn) return setMsg("クリエイター名を入力してください。");
    if (!t) return setMsg("動画タイトルを入力してください。");
    if (!v) return setMsg("動画URLを入力してください。");

    setLoading(true);

    // 1) videos に insert（pending）
    const insertVideo = await supabase
      .from("videos")
      .insert([
        {
          creator_name: cn,
          creator_email: creatorEmail.trim() || null,
          title: t,
          video_url: v,
          status: "pending",
          // genre列（旧）: 代表ジャンルが必要ならここに入れる（今回はnullでOK）
          genre: null,
        },
      ])
      .select("id")
      .single();

    if (insertVideo.error) {
      setMsg(`送信に失敗しました：${insertVideo.error.message}`);
      setLoading(false);
      return;
    }

    const videoId = insertVideo.data.id as string;

    // 2) video_genres に複数 insert
    const ids = Array.from(selectedGenreIds);
    if (ids.length > 0) {
      const rows = ids.map((genre_id) => ({
        video_id: videoId,
        genre_id,
      }));

      const insertVG = await supabase.from("video_genres").insert(rows);

      if (insertVG.error) {
        // videosは作られているので、ジャンル付与だけ失敗
        setMsg(
          `動画は作成されましたが、ジャンル付与に失敗しました：${insertVG.error.message}`
        );
        setLoading(false);
        return;
      }
    }

    setMsg("送信しました！管理者の承認後に公開されます。");

    // reset
    setTitle("");
    setVideoUrl("");
    setNote("");
    clearSelected();

    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(760px, 94vw)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <h1 style={{ margin: "0 0 10px 0", fontSize: 20 }}>
          クリエイター動画申請フォーム
        </h1>
        <p style={{ margin: "0 0 16px 0", fontSize: 12, opacity: 0.8 }}>
          Echi.tok に掲載したいサンプル動画の情報を入力してください。管理者が内容を確認し、承認された動画のみ公開されます。
        </p>

        {/* クリエイター名 */}
        <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>
          クリエイター名（必須）
        </label>
        <input
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            outline: "none",
          }}
        />

        {/* メール */}
        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
          メールアドレス（任意）
        </label>
        <input
          value={creatorEmail}
          onChange={(e) => setCreatorEmail(e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            outline: "none",
          }}
        />

        {/* タイトル */}
        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
          動画タイトル（必須）
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            outline: "none",
          }}
        />

        {/* ✅ ジャンル（カテゴリタブ＋複数チップ） */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: "bold" }}>
              ジャンル（複数選択OK）
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75, alignSelf: "center" }}>
                選択中：{selectedGenreIds.size}件
              </div>
              {selectedGenreIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelected}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  全解除
                </button>
              )}
            </div>
          </div>

          {/* カテゴリタブ */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            {categories.map((c) => {
              const active = c.id === activeCatId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCatId(c.id)}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(0,200,83,0.9)"
                      : "1px solid rgba(255,255,255,0.18)",
                    background: active
                      ? "rgba(0,200,83,0.18)"
                      : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: active ? "bold" : "normal",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* ジャンルチップ */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
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
                    border: active
                      ? "1px solid rgba(0,200,83,0.9)"
                      : "1px solid rgba(255,255,255,0.18)",
                    background: active
                      ? "rgba(0,200,83,0.18)"
                      : "rgba(255,255,255,0.06)",
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

          {/* 選択中のプレビュー */}
          {selectedNames.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              選択中：{selectedNames.join(" / ")}
            </div>
          )}
        </div>

        {/* URL */}
        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
          動画URL（必須：YouTube等）
        </label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=XXXX でもOK（自動でembedに変換）"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            outline: "none",
          }}
        />
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          通常の YouTube URL でも OK（自動で embed 形式へ変換します）
        </div>

        {/* メモ */}
        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
          メモ（管理者向け・任意）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="本編URLや切り抜き箇所など（※いまはDB保存しません）"
          style={{
            width: "100%",
            marginTop: 6,
            minHeight: 90,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            outline: "none",
            resize: "vertical",
          }}
        />

        {msg && (
          <div
            style={{
              marginTop: 12,
              background: msg.includes("失敗") || msg.includes("エラー")
                ? "rgba(255,0,0,0.15)"
                : "rgba(0,200,83,0.15)",
              border: msg.includes("失敗") || msg.includes("エラー")
                ? "1px solid rgba(255,0,0,0.5)"
                : "1px solid rgba(0,200,83,0.5)",
              padding: 10,
              borderRadius: 10,
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px 12px",
            borderRadius: 10,
            border: "none",
            background: "#00c853",
            color: "#000",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "送信中..." : "申請を送信する"}
        </button>
      </form>
    </main>
  );
}
