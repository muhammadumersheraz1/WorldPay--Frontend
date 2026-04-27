"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Landing page for Obtained "return URL" after 3DS / hosted checkout (OPP 2.2).
 * Configure this path in the Obtained merchant dashboard as the customer return URL, e.g.
 * http://localhost:3000/payment/return (stage only; use HTTPS in production).
 */
function ReturnContent() {
  const search = useSearchParams();
  const entries = Array.from(search.entries());

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">Payment return</h1>
        <p className="text-sm text-zinc-400">
          Query parameters from Obtained after redirect (names may match OPP 2.4.1: orderId,
          Status, PaymentToken, etc.). Final status should still be confirmed via server
          notification webhook.
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No query string on this URL.</p>
        ) : (
          <ul className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm font-mono">
            {entries.map(([k, v]) => (
              <li key={k} className="break-all py-1">
                <span className="text-emerald-400">{k}</span>=<span className="text-zinc-300">{v}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/checkout" className="inline-block text-sm text-emerald-400 hover:underline">
          Back to checkout
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 p-8 text-zinc-400">Loading…</div>}>
      <ReturnContent />
    </Suspense>
  );
}
