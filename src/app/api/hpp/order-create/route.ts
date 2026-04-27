import { NextRequest, NextResponse } from "next/server";

type OrderCreateBody = {
  token?: string;
  payload?: unknown;
};

const HPP_BASE_URL = "https://panel.merchantpayhub.com:8080";

export async function POST(req: NextRequest) {
  let body: OrderCreateBody = {};
  try {
    body = (await req.json()) as OrderCreateBody;
  } catch {
    body = {};
  }

  const baseUrl = HPP_BASE_URL;
  const token = String(body.token || process.env.HPP_API_BEARER_TOKEN || "").trim();
  const payload = body.payload;

  if (!token) {
    return NextResponse.json(
      { message: "Missing bearer token (login first, or set HPP_API_BEARER_TOKEN in frontend env)" },
      { status: 400 }
    );
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Missing payload object" }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch(`${baseUrl}/payment-user/order-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    let upstreamJson: unknown = null;
    try {
      upstreamJson = await upstreamRes.json();
    } catch {
      upstreamJson = { message: "Upstream order-create response was not JSON" };
    }

    return NextResponse.json(
      {
        upstreamStatus: upstreamRes.status,
        upstreamUrl: `${baseUrl}/payment-user/order-create`,
        data: upstreamJson,
      },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Order create request failed";
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}
