export const runtime = "nodejs";

type UpsertBody = {
  sessionId: string;            // used as resource_id
  token?: string;               // optional; default "internal"
  data: Record<string, any>;    // partial object to merge (we do GET->merge->PUT)
};

export async function POST(req: Request) {
  try {
    const DF_BASE_URL = process.env.DF_BASE_URL || "https://datafoundry.id.tue.nl";
    const DATASET_ID = process.env.DF_DATASET_ID;
    const API_TOKEN = process.env.DF_API_TOKEN;

    if (!DATASET_ID || !API_TOKEN) {
      return Response.json(
        { error: "Missing DF_DATASET_ID or DF_API_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as UpsertBody;
    const sessionId = (body.sessionId || "").trim();
    const token = (body.token || "internal").toString();
    const patch = body.data || {};

    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const url = `${DF_BASE_URL}/api/v1/datasets/entity/${DATASET_ID}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      api_token: API_TOKEN,
      resource_id: sessionId,
      token,
    };

    // 1) GET existing (may fail if not created yet)
    let existing: any = {};
    const getRes = await fetch(url, { method: "GET", headers });
    if (getRes.ok) {
      try {
        existing = await getRes.json();
      } catch {
        existing = {};
      }
    }

    // 2) Merge (shallow merge; good enough for session-level object)
    const merged = {
      ...(existing && typeof existing === "object" ? existing : {}),
      ...(patch && typeof patch === "object" ? patch : {}),
    };

    // 3) PUT merged back
    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(merged),
    });

    const text = await putRes.text();
    if (!putRes.ok) {
      return Response.json(
        { error: `DF PUT failed (${putRes.status})`, detail: text },
        { status: 500 }
      );
    }

    // DF returns JSON or string; try parse
    try {
      return Response.json({ ok: true, result: JSON.parse(text) });
    } catch {
      return Response.json({ ok: true, result: text });
    }
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
