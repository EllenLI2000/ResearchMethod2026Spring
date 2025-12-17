export async function dfUpsertSession(sessionId: string, data: Record<string, any>) {
  try {
    const res = await fetch("/api/df-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        token: "internal",
        data,
      }),
    });

    // prototype-friendly: do not crash UI
    if (!res.ok) {
      console.error("dfUpsertSession failed", await res.text());
      return;
    }
    await res.json().catch(() => null);
  } catch (e) {
    console.error("dfUpsertSession error", e);
  }
}
