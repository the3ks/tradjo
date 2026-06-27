import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <section className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-muted">
          Access your synced trades, journals, and dashboard.
        </p>
      </div>
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link className="font-medium text-accent" href="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}
