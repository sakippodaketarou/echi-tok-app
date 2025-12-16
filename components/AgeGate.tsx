"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AgeGate({ children }: Props) {
  const [checked, setChecked] = useState(false);   // クッキー確認が終わったか
  const [verified, setVerified] = useState(false); // 年齢確認OKか

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("age_verified="));

    if (cookie && cookie.split("=")[1] === "true") {
      setVerified(true);
    }
    setChecked(true);
  }, []);

  const handleAllow = () => {
    // 30日間有効
    document.cookie = "age_verified=true; path=/; max-age=2592000";
    setVerified(true);
  };

  const handleDeny = () => {
    // 未成年が押したときの遷移先（必要なら好きなURLに変えてOK）
    window.location.href = "https://google.com";
  };

  // まだクッキー確認前（SSRとの不整合防止）
  if (!checked) return null;

  // 年齢確認OK → 通常コンテンツを表示
  if (verified) {
    return <>{children}</>;
  }

  // 年齢確認NG（未確認） → 黒い画面＋モーダルのみ表示
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",      // 完全な黒（透けない）
        color: "#fff",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h2 style={{ fontSize: "26px", marginBottom: "16px" }}>年齢確認</h2>

      <p style={{ fontSize: "16px", marginBottom: "20px", opacity: 0.9 }}>
        このサイトには成人向けコンテンツが含まれています。<br />
        18歳以上ですか？
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          onClick={handleAllow}
          style={{
            padding: "10px 20px",
            background: "#00c853",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            color: "#000",
          }}
        >
          はい（18歳以上です）
        </button>

        <button
          onClick={handleDeny}
          style={{
            padding: "10px 20px",
            background: "#ff5252",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          いいえ
        </button>
      </div>
    </div>
  );
}
