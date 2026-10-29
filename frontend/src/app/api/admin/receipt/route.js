// frontend/src/app/api/admin/receipt/route.js
// GET  → { configured } (is ANTHROPIC_API_KEY set?)
// POST → { image: <base64>, mediaType } → reads a receipt photo with Claude
//        and returns { vendor, date, total, tax, subtotal, category, ... }.
// The owner always confirms the result before anything is saved.
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/server/adminAuth";
import { EXPENSE_CATEGORIES } from "@/lib/books";

export const maxDuration = 60;

const MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BASE64 = 7_000_000; // ~5 MB image

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_receipt", "vendor", "date", "subtotal", "tax", "total", "category", "payment_method", "line_items", "notes"],
  properties: {
    is_receipt: { type: "boolean", description: "False if the image is not a receipt or bill." },
    vendor: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "Purchase date as YYYY-MM-DD." },
    subtotal: { type: ["number", "null"] },
    tax: { type: ["number", "null"], description: "Sales tax charged. 0 if the receipt shows no tax." },
    total: { type: ["number", "null"] },
    category: { type: "string", enum: EXPENSE_CATEGORIES.map((c) => c.key) },
    payment_method: { type: ["string", "null"], description: "e.g. Visa ending 1234, cash, check." },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "amount"],
        properties: { description: { type: "string" }, amount: { type: "number" } },
      },
    },
    notes: { type: ["string", "null"], description: "Anything unclear, e.g. a smudged total." },
  },
};

const PROMPT = `This is a photo of a receipt or vendor bill for Auto Pro, an auto repair shop and used-car dealer in Leesburg, Florida.
Read it and fill in the fields. Use null for anything you can't read; don't guess numbers.
Pick the category that fits the shop's books best:
${EXPENSE_CATEGORIES.map((c) => `- ${c.key}: ${c.label}`).join("\n")}
Auto parts, fluids and filters bought for a customer's car are "parts". Gas for the shop truck is "vehicle".`;

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Receipt reading isn't set up yet (ANTHROPIC_API_KEY). You can still type the details in." }, { status: 501 });
  }

  const body = await request.json().catch(() => ({}));
  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mediaType = MEDIA.has(body.mediaType) ? body.mediaType : "image/jpeg";
  if (!image || image.length > MAX_BASE64) {
    return NextResponse.json({ error: "Send one receipt photo under 5 MB." }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Couldn't read that image. Please enter the details by hand." }, { status: 422 });
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Couldn't read that receipt clearly. Please enter the details by hand." }, { status: 422 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Receipt reader is busy. Try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Receipt reader key is invalid (ANTHROPIC_API_KEY)." }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Receipt reader error (${error.status}).` }, { status: 502 });
    }
    throw error;
  }
}
