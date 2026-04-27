"use client";

import { useRef, useState } from "react";

import { TEST_CARD_SCENARIOS, type TestCardScenario } from "@/data/testCardScenarios";

const API_BASE =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000";

const INIT_PATH = "/api/payments/obtained/init/";
const INIT_URL = `${API_BASE}${INIT_PATH}`;

type InitResponse = {
  orderId?: string;
  obtained?: {
    success?: boolean;
    errorCode?: number;
    errorMessage?: string | null;
    data?: {
      token?: string;
      status?: number;
      redirectURL?: string | null;
    };
  };
  detail?: string;
};

type ApiTrace = {
  pageUrl: string;
  requestUrl: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  httpStatus: number | null;
  responseBody: unknown;
};

function setNamedInput(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement) {
    el.value = value;
  }
}

/** Opens Obtained 3DS / cashier URL in a new browser tab. Returns false if pop-ups are blocked. */
function openObtainedInNewTab(url: string): boolean {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  return win != null;
}

/** Fills card number, name on card, amount, and CVV from scenario / flow defaults. */
function applyScenarioToForm(form: HTMLFormElement | null, scenario: TestCardScenario | undefined) {
  if (!form || !scenario) return;
  setNamedInput(form, "cardNumber", scenario.cardNo);
  setNamedInput(form, "cardName", scenario.cardholderName ?? "Eric Cantona");
  if (scenario.amount) {
    setNamedInput(form, "amount", scenario.amount);
  } else if (scenario.type === "Non-3DS") {
    setNamedInput(form, "amount", "10.00");
  }
  if (scenario.cvv) {
    setNamedInput(form, "cvv", scenario.cvv);
  } else if (scenario.type === "Non-3DS") {
    setNamedInput(form, "cvv", "123");
  }
}

function buildBody(fd: FormData) {
  return {
    amount: String(fd.get("amount") || "").trim(),
    currency: String(fd.get("currency") || "").trim(),
    serviceName: "WorldCard checkout",
    payerDetails: {
      firstName: String(fd.get("firstName") || "").trim(),
      lastName: String(fd.get("lastName") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
    },
    billingAddress: {
      street: String(fd.get("street") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      state: String(fd.get("state") || "").trim(),
      country: String(fd.get("country") || "").trim(),
      zip: String(fd.get("zip") || "").trim(),
    },
    paymentInstrument: {
      customerAccountNumber: String(fd.get("cardNumber") || "")
        .trim()
        .replace(/\s+/g, ""),
      customerAccountName: String(fd.get("cardName") || "").trim(),
      securityCode: String(fd.get("cvv") || "").trim(),
      expirationMonth: String(fd.get("expMonth") || "").trim(),
      expirationYear: String(fd.get("expYear") || "").trim(),
    },
  };
}

export default function CheckoutPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<ApiTrace | null>(null);
  const [redirectURL, setRedirectURL] = useState<string | null>(null);
  const [autoRedirect, setAutoRedirect] = useState(false);

  const selectedScenario = TEST_CARD_SCENARIOS.find((s) => s.id === selectedScenarioId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTrace(null);
    setRedirectURL(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = buildBody(fd);
    const headers = { "Content-Type": "application/json" };

    const pageUrl =
      typeof window !== "undefined" ? window.location.href : "http://localhost:3000/checkout";

    try {
      const res = await fetch(INIT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      let json: InitResponse;
      try {
        json = (await res.json()) as InitResponse;
      } catch {
        json = { detail: "Response was not JSON" };
      }

      setTrace({
        pageUrl,
        requestUrl: INIT_URL,
        method: "POST",
        requestHeaders: headers,
        requestBody: body,
        httpStatus: res.status,
        responseBody: json,
      });

      if (!res.ok) {
        setError(typeof json.detail === "string" ? json.detail : JSON.stringify(json));
        return;
      }

      const url = json.obtained?.data?.redirectURL;
      if (url) {
        setRedirectURL(url);
        if (autoRedirect) {
          if (!openObtainedInNewTab(url)) {
            setError(
              "Pop-up blocked: allow pop-ups for this site, or turn off auto-open and use the button below."
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
      setTrace({
        pageUrl,
        requestUrl: INIT_URL,
        method: "POST",
        requestHeaders: headers,
        requestBody: body,
        httpStatus: null,
        responseBody: { error: msg },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pay with Obtained</h1>
          <p className="mt-1 text-sm text-zinc-400">
            This page calls your Django API, which calls OPP{" "}
            <code className="text-zinc-300">initializePayment</code>. Below the form, every
            submit shows the exact URL, JSON payload, HTTP status, and JSON response.
          </p>
          <p className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">Obtained 3DS redirect (sandbox):</span> use CVV{" "}
            <code className="text-emerald-300">701</code> and amount{" "}
            <code className="text-emerald-300">7000</code>–<code className="text-emerald-300">7999</code>{" "}
            to receive a <code className="text-zinc-300">redirectURL</code>. Defaults below match that.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={autoRedirect}
            onChange={(e) => setAutoRedirect(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Auto-open Obtained in a <span className="font-medium text-zinc-300">new tab</span> when{" "}
          <code className="text-zinc-300">redirectURL</code> is returned (otherwise use the
          button below).
        </label>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <label className="block text-sm font-medium text-amber-100/90">
              Test card (from <code className="text-amber-200/90">Test Cards + scenarios.csv</code>)
            </label>
            <select
              className="mt-2 w-full rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={selectedScenarioId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedScenarioId(id);
                const scenario = TEST_CARD_SCENARIOS.find((s) => s.id === id);
                applyScenarioToForm(formRef.current, scenario);
              }}
            >
              <option value="">Custom — do not fill from list</option>
              {TEST_CARD_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {selectedScenario && (
              <p className="mt-2 text-xs leading-relaxed text-amber-200/80">
                {selectedScenario.hint ??
                  `${selectedScenario.brand} · ${selectedScenario.type} · ${selectedScenario.result}. Card and amount (if required) were applied to the fields below.`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">Amount</span>
              <input name="amount" defaultValue="7000.00" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Currency</span>
              <input name="currency" defaultValue="USD" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-zinc-400">First name</span>
              <input name="firstName" defaultValue="Eric" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm">
              <span className="text-zinc-400">Last name</span>
              <input name="lastName" defaultValue="Cantona" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">Email</span>
              <input name="email" type="email" defaultValue="demo@example.com" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <label className="text-sm col-span-2">
              <span className="text-zinc-400">Phone (+country)</span>
              <input name="phone" defaultValue="+35799843239" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Billing</p>
            <label className="text-sm block">
              <span className="text-zinc-400">Street</span>
              <input name="street" defaultValue="Street 1" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-zinc-400">City</span>
                <input name="city" defaultValue="City" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">State</span>
                <input name="state" defaultValue="State" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">Country (ISO2)</span>
                <input name="country" defaultValue="CY" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">ZIP</span>
                <input name="zip" defaultValue="1234" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2" required />
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Card (paymentInstrument)
            </p>
            <label className="text-sm block">
              <span className="text-zinc-400">Card number</span>
              <input
                name="cardNumber"
                autoComplete="cc-number"
                inputMode="numeric"
                defaultValue="4242424242424242"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
                required
              />
            </label>
            <label className="text-sm block">
              <span className="text-zinc-400">Name on card</span>
              <input
                name="cardName"
                autoComplete="cc-name"
                defaultValue="Eric Cantona"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                required
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="text-zinc-400">MM</span>
                <input
                  name="expMonth"
                  autoComplete="cc-exp-month"
                  defaultValue="12"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
                  required
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">YYYY</span>
                <input
                  name="expYear"
                  autoComplete="cc-exp-year"
                  defaultValue="2027"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
                  required
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-400">CVV</span>
                <input
                  name="cvv"
                  autoComplete="cc-csc"
                  defaultValue="701"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
                  required
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Calling API…" : "Continue to payment"}
          </button>
        </form>

        {error && (
          <pre className="overflow-x-auto rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-xs text-red-200">
            {error}
          </pre>
        )}

        {redirectURL && (
          <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm">
            <p className="font-medium text-emerald-200">Obtained returned a redirect URL</p>
            <p className="mt-1 break-all text-xs text-emerald-100/90">{redirectURL}</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              onClick={() => {
                if (!openObtainedInNewTab(redirectURL)) {
                  setError("Pop-up blocked: allow pop-ups for this site, then try again.");
                }
              }}
            >
              Open Obtained in new tab
            </button>
          </div>
        )}

        {trace && (
          <section className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              API trace (last submit)
            </h2>
            <div>
              <p className="text-xs font-medium text-zinc-500">This page</p>
              <p className="break-all font-mono text-xs text-zinc-300">{trace.pageUrl}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Request</p>
              <p className="font-mono text-xs text-emerald-300">
                {trace.method} {trace.requestUrl}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Headers</p>
              <pre className="mt-1 max-h-32 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                {JSON.stringify(trace.requestHeaders, null, 2)}
              </pre>
              <p className="mt-2 text-xs text-zinc-500">Payload (JSON body)</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                {JSON.stringify(trace.requestBody, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Response</p>
              <p className="text-xs text-zinc-400">
                HTTP status:{" "}
                <span className="font-mono text-zinc-200">
                  {trace.httpStatus === null ? "(network error)" : trace.httpStatus}
                </span>
              </p>
              <pre className="mt-2 max-h-96 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                {JSON.stringify(trace.responseBody, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
