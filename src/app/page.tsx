import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-6 text-center text-zinc-100">
      <h1 className="text-3xl font-semibold tracking-tight">WorldCard · Obtained</h1>
      <p className="max-w-md text-sm text-zinc-400">
        Django signs InitPayment; Next.js collects payer details and follows{" "}
        <code className="text-zinc-300">redirectURL</code> when OPP returns it.
      </p>
      <Link
        href="/checkout"
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Open checkout
      </Link>
      <Link
        href="/hpp"
        className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
      >
        Open HPP page
      </Link>
    </main>
  );
}
