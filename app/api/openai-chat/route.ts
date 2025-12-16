import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { systemPrompt, messages } = (await req.json()) as {
      systemPrompt: string;
      messages: { role: "user" | "assistant"; content: string }[];
    };

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return Response.json({ content: resp.output_text ?? "" });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
