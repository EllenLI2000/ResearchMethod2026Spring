"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dfUpsertSession } from "@/lib/dfClient";

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

type StoredWithChat = {
  sessionId: string;
  createdAt: string;
  pastSelf: {
    name: string;
    shortBio: string;
    description?: string;
  };
  futureSelf: {
    name: string;
    shortBio: string;
    description?: string;
  };
  chat: {
    past: Msg[];
    future: Msg[];
  };
};

export default function ReflectionPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredWithChat | null>(null);

  // Reflection answers
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("temporalSelvesWithChat");
      if (!raw) return;
      setData(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  /**
   * =========================
   * STUDENT-EDITABLE ZONE (REFLECTION QUESTIONS)
   * Students can reword, remove, or add questions here.
   * Keys are used only for local state.
   * =========================
   */
  const questions: { key: string; label: string; hint?: string }[] = [
    {
      key: "difference",
      label:
        "How did the past self and future self differ in how they responded to you?",
      hint: "Consider tone, focus, assumptions, or what each self emphasized.",
    },
    {
      key: "surprise",
      label:
        "Was there anything that surprised you in either conversation?",
      hint: "This could be something you did not expect yourself to say or hear.",
    },
    {
      key: "alignment",
      label:
        "Which response felt more aligned with how you see yourself right now? Why?",
    },
    {
      key: "insight",
      label:
        "Did these conversations change how you understand your situation or yourself?",
    },
    {
      key: "nextStep",
      label:
        "After talking to both selves, what feels like a reasonable next step?",
      hint: "This does not have to be big or definitive.",
    },
  ];

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function finish() {
    // Save reflection answers locally (prototype-friendly)
    localStorage.setItem(
      "temporalSelvesReflection",
      JSON.stringify({
        sessionId: data?.sessionId,
        createdAt: new Date().toISOString(),
        answers,
      })
    );

    /**
     * =========================
     * STUDENT-EDITABLE ZONE (END OF FLOW)
     * Students may redirect to a thank-you page or external survey here.
     * =========================
     */
    await dfUpsertSession(data?.sessionId || "unknown", {
  reflection: {
    answers,
    finishedAt: new Date().toISOString(),
  },
});
    alert("Thank you for your reflection.");
    router.push("/");
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h1>Reflection</h1>
        <p>No chat data found. Please complete the chat first.</p>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #cfcfcf",
            background: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          Back to Start
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      {/**
       * =========================
       * STUDENT-EDITABLE ZONE (PAGE TITLE & INTRO TEXT)
       * =========================
       */}
      <h1 style={{ marginTop: 0 }}>Reflection</h1>
      <p style={{ maxWidth: 720, color: "#444", lineHeight: 1.5 }}>
        You have now spoken with both your past self and your future self.
        Take a moment to reflect on how these conversations differed and what
        they revealed.
      </p>

      {/* Context summary */}
      <section
        style={{
          marginTop: 20,
          padding: 16,
          border: "1px solid #e2e2e2",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>Conversation context</div>

        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
          <div>
            <b>Past self:</b> {data.pastSelf.name} — {data.pastSelf.shortBio}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>Future self:</b> {data.futureSelf.name} —{" "}
            {data.futureSelf.shortBio}
          </div>
        </div>
      </section>

      {/* Reflection questions */}
      <section style={{ marginTop: 28 }}>
        {questions.map((q) => (
          <div
            key={q.key}
            style={{
              marginBottom: 22,
              paddingBottom: 22,
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {q.label}
            </div>

            {q.hint ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 8,
                }}
              >
                {q.hint}
              </div>
            ) : null}

            <textarea
              rows={4}
              value={answers[q.key] || ""}
              onChange={(e) => updateAnswer(q.key, e.target.value)}
              placeholder="Write your response here…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cfcfcf",
                fontSize: 14,
                resize: "vertical",
                lineHeight: 1.45,
              }}
            />
          </div>
        ))}
      </section>

      {/* Actions */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={() => router.push("/chat")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #cfcfcf",
            background: "#fafafa",
            cursor: "pointer",
          }}
        >
          ← Back to Chat
        </button>

        <button
          onClick={finish}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #cfcfcf",
            background: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          Finish
        </button>
      </div>
    </main>
  );
}
