"use client";

import { useState } from "react";

type ApiTrace = {
  label: string;
  requestUrl: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  httpStatus: number | null;
  responseBody: unknown;
};

type ProxyResponse<T = unknown> = {
  upstreamStatus?: number;
  upstreamUrl?: string;
  data?: T;
  message?: string;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  statusCode?: number;
  data?: {
    token?: string;
  };
};

type CreateOrderResponse = {
  success?: boolean;
  message?: string;
  statusCode?: number;
  data?: {
    success?: boolean;
    info_type?: number;
    info_data?: {
      message?: string;
      order_id?: string;
      payment_link?: string;
      status?: number;
    };
  };
};

type TxStatusResponse = {
  statusCode?: number;
  data?: {
    success?: boolean;
    info_type?: number;
    info_data?: {
      order_id?: string;
      status?: number;
      amount?: number;
      amount_paid?: number;
      timestamp?: number;
    };
  };
};

function asText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function openInNewTab(url: string): boolean {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  return win != null;
}

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000";

export default function HppPage() {
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<ApiTrace[]>([]);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [statusResult, setStatusResult] = useState<TxStatusResponse | null>(null);
  const [autoOpen, setAutoOpen] = useState(true);

  async function onGenerateToken() {
    setTokenLoading(true);
    setError(null);
    try {
      const loginUrl = `${DJANGO_API_BASE}/api/payments/obtained/hpp/login/`;
      const loginHeaders = { "Content-Type": "application/json" };
      const loginRes = await fetch(loginUrl, {
        method: "POST",
        headers: loginHeaders,
        body: JSON.stringify({}),
      });

      let loginJson: ProxyResponse<LoginResponse>;
      try {
        loginJson = (await loginRes.json()) as ProxyResponse<LoginResponse>;
      } catch {
        loginJson = { message: "Login response was not JSON" };
      }

      setTraces((prev) => [
        {
          label: "1) Generate token via login API",
          requestUrl: loginUrl,
          method: "POST",
          requestHeaders: loginHeaders,
          requestBody: {},
          httpStatus: loginRes.status,
          responseBody: loginJson,
        },
        ...prev,
      ]);

      const loginData = loginJson.data;
      const token = loginData?.data?.token;
      if (
        !loginRes.ok ||
        loginJson.upstreamStatus !== 200 ||
        loginData?.statusCode !== 200 ||
        !token
      ) {
        setError(
          [
            "Token generation failed.",
            `HTTP=${loginRes.status}`,
            `upstreamHTTP=${loginJson.upstreamStatus ?? "?"}`,
            `statusCode=${loginData?.statusCode ?? "?"}`,
            `message=${loginData?.message ?? loginJson.message ?? "unknown"}`,
          ].join(" ")
        );
        return;
      }
      setTokenInput(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token request failed";
      setError(msg);
    } finally {
      setTokenLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTraces((prev) => prev);
    setPaymentLink(null);
    setOrderId(null);
    setStatusResult(null);

    const fd = new FormData(e.currentTarget);

    const orderBody = {
      amount: asText(fd.get("amount")),
      customer_id: asText(fd.get("customerId")) || undefined,
      customer_name: asText(fd.get("customerName")),
      customer_email: asText(fd.get("customerEmail")),
      customer_phone: asText(fd.get("customerPhone")),
      typeOfPayment: asText(fd.get("typeOfPayment")),
      currencyType: asText(fd.get("currencyType")),
      callBackUrl: asText(fd.get("callBackUrl")),
      vpa: asText(fd.get("vpa")),
      reference: asText(fd.get("reference")),
      description: asText(fd.get("description")),
      additionalParameters: {
        key2: asText(fd.get("key2")),
        key12: asText(fd.get("key12")),
        key22: asText(fd.get("key22")),
        key23: asText(fd.get("key23")),
        key24: asText(fd.get("key24")),
        key25: asText(fd.get("key25")),
        key26: asText(fd.get("key26")),
      },
    };

    const nextTraces: ApiTrace[] = [];

    try {
      const token = tokenInput.trim();
      if (!token) {
        setError("Token is required. Generate token first or paste one manually.");
        return;
      }

      const orderUrl = `${DJANGO_API_BASE}/api/payments/obtained/hpp/order-create/`;
      const orderHeaders = {
        "Content-Type": "application/json",
      };
      const createRes = await fetch(orderUrl, {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          token,
          payload: orderBody,
        }),
      });
      let createJson: ProxyResponse<CreateOrderResponse>;
      try {
        createJson = (await createRes.json()) as ProxyResponse<CreateOrderResponse>;
      } catch {
        createJson = { message: "Create order response was not JSON" };
      }
      nextTraces.push({
        label: "2) Create HPP order",
        requestUrl: orderUrl,
        method: "POST",
        requestHeaders: orderHeaders,
        requestBody: {
          token: "***",
          payload: orderBody,
        },
        httpStatus: createRes.status,
        responseBody: createJson,
      });
      setTraces(nextTraces);

      const createData = createJson.data;
      const orderData = createData?.data;
      const infoType = orderData?.info_type;
      const apiSuccess = orderData?.success;
      const returnedOrderId = orderData?.info_data?.order_id ?? null;
      const link = orderData?.info_data?.payment_link ?? null;

      setOrderId(returnedOrderId);

      if (
        !createRes.ok ||
        createJson.upstreamStatus !== 200 ||
        createData?.statusCode !== 200 ||
        infoType !== 1 ||
        !apiSuccess ||
        !link
      ) {
        setError(
          [
            "Create order failed.",
            `HTTP=${createRes.status}`,
            `upstreamHTTP=${createJson.upstreamStatus ?? "?"}`,
            `statusCode=${createData?.statusCode ?? "?"}`,
            `info_type=${infoType ?? "?"}`,
            `success=${String(apiSuccess)}`,
            `message=${orderData?.info_data?.message ?? createData?.message ?? createJson.message ?? "unknown"}`,
          ].join(" ")
        );
        return;
      }

      setPaymentLink(link);
      if (autoOpen && !openInNewTab(link)) {
        setError("Pop-up blocked. Allow pop-ups, or use the button to open payment link manually.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
      setTraces(nextTraces);
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    const token = tokenInput.trim();
    if (!orderId || !token) {
      setError("Order ID or token missing. Create an order first.");
      return;
    }
    const url = `${DJANGO_API_BASE}/api/payments/obtained/hpp/status/`;
    const headers = { "Content-Type": "application/json" };
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          token,
          orderId,
        }),
      });
      let json: ProxyResponse<TxStatusResponse>;
      try {
        json = (await res.json()) as ProxyResponse<TxStatusResponse>;
      } catch {
        json = {};
      }
      setStatusResult(json.data ?? null);
      setTraces((prev) => [
        ...prev,
        {
          label: "3) Transaction status via Next API",
          requestUrl: url,
          method: "POST",
          requestHeaders: headers,
          requestBody: { orderId, token: "***" },
          httpStatus: res.status,
          responseBody: json,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Status request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hosted Payment Page (HPP)</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Implements the PDF flow: <code className="text-zinc-300">POST /login</code>, then{" "}
            <code className="text-zinc-300">POST /payment-user/order-create</code>, then redirect to{" "}
            <code className="text-zinc-300">payment_link</code>.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Backend API: <code className="text-zinc-300">{DJANGO_API_BASE}</code>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            On Create HPP Order click: frontend calls Django HPP APIs; Django performs PSP login and order calls from backend server IP.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={autoOpen}
            onChange={(e) => setAutoOpen(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Auto-open payment link in a new tab
        </label>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">Token (manual or generated)</p>
            <button
              type="button"
              onClick={onGenerateToken}
              disabled={tokenLoading || loading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {tokenLoading ? "Generating..." : "Generate token"}
            </button>
          </div>
          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            rows={3}
            placeholder="Paste token here or click Generate token"
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100"
          />
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="grid grid-cols-2 gap-3">
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-zinc-400">Amount</span>
              <input name="amount" defaultValue="600" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Currency</span>
              <input name="currencyType" defaultValue="USD" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Type of payment</span>
              <input name="typeOfPayment" defaultValue="DEPOSIT" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Reference</span>
              <input
                name="reference"
                defaultValue={`REF-${Date.now()}`}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">Callback URL</span>
              <input
                name="callBackUrl"
                defaultValue="http://localhost:3000/payment/return"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">Description</span>
              <input
                name="description"
                defaultValue="Test Payment"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-zinc-400">Customer ID</span>
              <input name="customerId" defaultValue="01" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Customer name</span>
              <input name="customerName" defaultValue="John Dave" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Customer email</span>
              <input name="customerEmail" defaultValue="xojopay@proton.me" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Customer phone</span>
              <input name="customerPhone" defaultValue="+491628420580" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">VPA (optional)</span>
              <input name="vpa" defaultValue="" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" />
            </label>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              additionalParameters
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-zinc-400">key2 (country code)</span>
                <input name="key2" defaultValue="US" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">key12 (IP)</span>
                <input name="key12" defaultValue="171.60.137.3" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">key22 (DOB)</span>
                <input name="key22" defaultValue="1990-01-15" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">key23 (state)</span>
                <input name="key23" defaultValue="IL" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">key24 (city)</span>
                <input name="key24" defaultValue="Chicago" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">key25 (postal)</span>
                <input name="key25" defaultValue="60601" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm col-span-2">
                <span className="text-zinc-400">key26 (street)</span>
                <input name="key26" defaultValue="400 Michigan Ave" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Calling API..." : "Create HPP order"}
          </button>
        </form>

        {error && (
          <pre className="overflow-x-auto rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-xs text-red-200">
            {error}
          </pre>
        )}

        {paymentLink && (
          <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm">
            <p className="font-medium text-emerald-200">Payment link created</p>
            <p className="mt-1 break-all text-xs text-emerald-100/90">{paymentLink}</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              onClick={() => {
                if (!openInNewTab(paymentLink)) {
                  setError("Pop-up blocked. Allow pop-ups, then try again.");
                }
              }}
            >
              Open payment link
            </button>
          </div>
        )}

        {orderId && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
            <p className="text-sm text-zinc-300">
              Order ID: <code className="text-emerald-300">{orderId}</code>
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                checkStatus();
              }}
            >
              Check transaction status
            </button>
          </div>
        )}

        {statusResult && (
          <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 text-xs text-zinc-200">
            {JSON.stringify(statusResult, null, 2)}
          </pre>
        )}

        {traces.length > 0 && (
          <section className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              API trace
            </h2>
            {traces.map((trace, idx) => (
              <div key={`${trace.label}-${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-medium text-zinc-500">{trace.label}</p>
                <p className="mt-1 font-mono text-xs text-emerald-300">
                  {trace.method} {trace.requestUrl}
                </p>
                <p className="mt-2 text-xs text-zinc-500">Headers</p>
                <pre className="mt-1 max-h-32 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                  {JSON.stringify(trace.requestHeaders, null, 2)}
                </pre>
                <p className="mt-2 text-xs text-zinc-500">Payload</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                  {JSON.stringify(trace.requestBody, null, 2)}
                </pre>
                <p className="mt-2 text-xs text-zinc-400">
                  HTTP status:{" "}
                  <span className="font-mono text-zinc-200">
                    {trace.httpStatus === null ? "(network error)" : trace.httpStatus}
                  </span>
                </p>
                <pre className="mt-2 max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                  {JSON.stringify(trace.responseBody, null, 2)}
                </pre>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
