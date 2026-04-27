import { NextRequest, NextResponse } from "next/server";

type StatusBody = {
  token?: string;
  orderId?: string;
};

const HPP_BASE_URL = "https://panel.merchantpayhub.com:8080";

export async function POST(req: NextRequest) {
  let body: StatusBody = {};
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    body = {};
  }

  const baseUrl = HPP_BASE_URL;
  const token = String(body.token || process.env.HPP_API_BEARER_TOKEN || "").trim();
  const orderId = String(body.orderId || "").trim();

  if (!token) {
    return NextResponse.json(
      { message: "Missing bearer token (login first, or set HPP_API_BEARER_TOKEN in frontend env)" },
      { status: 400 }
    );
  }
  if (!orderId) {
    return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
  }

  const url = `${baseUrl}/payment-user/transaction-status/${encodeURIComponent(orderId)}`;

  try {
    const upstreamRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    let upstreamJson: unknown = null;
    try {
      upstreamJson = await upstreamRes.json();
    } catch {
      upstreamJson = { message: "Upstream status response was not JSON" };
    }

    return NextResponse.json(
      {
        upstreamStatus: upstreamRes.status,
        upstreamUrl: url,
        data: upstreamJson,
      },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Status request failed";
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}
