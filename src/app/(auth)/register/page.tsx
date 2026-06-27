import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <section className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-muted">
          Start with a private workspace for your trading journal.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-medium text-accent" href="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
