"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Stored = {
  sessionId: string;
  createdAt: string;
  pastSelf: { name: string; shortBio: string };
  futureSelf: { name: string; shortBio: string };
};

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const bubbleBase: React.CSSProperties = {
  maxWidth: "80%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e2e2",
  whiteSpace: "pre-wrap",
  lineHeight: 1.35,
  fontSize: 14,
};

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const router = useRouter();

  const [data, setData] = useState<Stored | null>(null);
  const [active, setActive] = useState<"past" | "future">("past");

  const [pastMsgs, setPastMsgs] = useState<Msg[]>([]);
  const [futureMsgs, setFutureMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const sendingRef = useRef(false);

  // ---- load profile + restore chat if exists ----
  useEffect(() => {
    const profile = loadJson<Stored>("temporalSelves");
    if (!profile) return;
    setData(profile);

    const saved = loadJson<any>("temporalSelvesWithChat");
    if (saved?.chat?.past?.length || saved?.chat?.future?.length) {
      setPastMsgs(saved.chat.past ?? []);
      setFutureMsgs(saved.chat.future ?? []);
      return;
    }

    // init greetings (one per persona)
    const p0: Msg = {
      role: "assistant",
      content: `Hi — I’m your past self “${profile.pastSelf.name}”. What’s bothering you right now?`,
      ts: Date.now(),
    };
    const f0: Msg = {
      role: "assistant",
      content: `Hi — I’m your future self “${profile.futureSelf.name}”. What’s bothering you right now?`,
      ts: Date.now(),
    };
    setPastMsgs([p0]);
    setFutureMsgs([f0]);
  }, []);

  const currentMsgs = active === "past" ? pastMsgs : futureMsgs;

  const systemPrompt = useMemo(() => {
    if (!data) return "";
    const self = active === "past" ? data.pastSelf : data.futureSelf;

    // 关键：shortBio 明确写进去，并且强约束“必须一致”
    return `
You are the user's ${active} self.

Identity you must embody:
- Name: ${self.name}
- Short bio: ${self.shortBio}

Rules:
- Speak in first person as ${self.name}.
- Stay consistent with the short bio at all times.
- Be reflective and supportive, not clinical.
- Ask at most one gentle follow-up question.
- Keep responses concise (2–6 sentences).
`.trim();
  }, [data, active]);

  function persist(nextPast: Msg[], nextFuture: Msg[]) {
    if (!data) return;
    localStorage.setItem(
      "temporalSelvesWithChat",
      JSON.stringify({
        ...data,
        chat: { past: nextPast, future: nextFuture },
        updatedAt: new Date().toISOString(),
      })
    );
  }

  async function callLLM(persona: "past" | "future", fullHistory: Msg[], userText: string) {
    // 关键：把该 persona 的历史一起发过去（否则不“定制”）
    const messages = fullHistory
      .filter((m) => m.content !== "…")
      .slice(-12) // 最近 12 条，够用也省 token
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/openai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt, // 注意：systemPrompt 已经根据 active persona 生成
        messages: [...messages, { role: "user", content: userText }],
      }),
    });

    if (!res.ok) return "Sorry — I’m having trouble responding right now.";
    const json = await res.json();
    return (json?.content ?? "…").toString().trim() || "…";
  }

  async function send() {
    const text = input.trim();
    if (!text || !data) return;
    if (sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Msg = { role: "user", content: text, ts: Date.now() };
    const thinking: Msg = { role: "assistant", content: "…", ts: Date.now() + 1 };

    setInput("");

    if (active === "past") {
      const base = [...pastMsgs, userMsg, thinking];
      setPastMsgs(base);

      const reply = await callLLM("past", [...pastMsgs], text);
      const assistantMsg: Msg = { role: "assistant", content: reply, ts: Date.now() + 2 };

      const finalPast = [...pastMsgs, userMsg, assistantMsg];
      setPastMsgs(finalPast);
      persist(finalPast, futureMsgs);
    } else {
      const base = [...futureMsgs, userMsg, thinking];
      setFutureMsgs(base);

      const reply = await callLLM("future", [...futureMsgs], text);
      const assistantMsg: Msg = { role: "assistant", content: reply, ts: Date.now() + 2 };

      const finalFuture = [...futureMsgs, userMsg, assistantMsg];
      setFutureMsgs(finalFuture);
      persist(pastMsgs, finalFuture);
    }

    sendingRef.current = false;
  }

  function next() {
    router.push("/reflection");
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h1>Chat</h1>
        <p>No profile found. Go back to Customize.</p>
        <button
          onClick={() => router.push("/")}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cfcfcf", background: "#f0f0f0" }}
        >
          Back
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Chat</h1>
        <button
          onClick={next}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cfcfcf", background: "#f0f0f0", cursor: "pointer" }}
        >
          Next → Reflection
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Tab active={active === "past"} title={`Past: ${data.pastSelf.name}`} onClick={() => setActive("past")} />
        <Tab active={active === "future"} title={`Future: ${data.futureSelf.name}`} onClick={() => setActive("future")} />
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #e2e2e2",
          borderRadius: 10,
          background: "#fafafa",
          fontSize: 13,
          color: "#444",
        }}
      >
        <div style={{ fontWeight: 600 }}>{active === "past" ? data.pastSelf.name : data.futureSelf.name}</div>
        <div style={{ marginTop: 4 }}>{active === "past" ? data.pastSelf.shortBio : data.futureSelf.shortBio}</div>
      </div>

      <div style={{ marginTop: 14, height: 420, border: "1px solid #e2e2e2", borderRadius: 10, padding: 12, overflowY: "auto", background: "#fff" }}>
        {currentMsgs.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ ...bubbleBase, background: isUser ? "#f0f0f0" : "#fafafa" }}>{m.content}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #cfcfcf", fontSize: 14 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button onClick={() => void send()} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cfcfcf", background: "#f0f0f0", cursor: "pointer" }}>
          Send
        </button>
      </div>
    </main>
  );
}

function Tab(props: { active: boolean; title: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #cfcfcf",
        background: props.active ? "#f0f0f0" : "#fafafa",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {props.title}
    </button>
  );
}
