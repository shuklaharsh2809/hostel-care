import type { Metadata } from "next";
import Link from "next/link";
import { login } from "../actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-ink-500">Log in to manage your hostels.</p>
      <div className="mt-6">
        <Notice tone="info">
          Demo account: <b>demo@hostelcare.app</b> / <b>demo1234</b>
        </Notice>
      </div>
      <ActionForm action={login} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required defaultValue="demo@hostelcare.app" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full py-2.5" pendingText="Logging in…">
          Log in
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Register your hostel
        </Link>
      </p>
    </>
  );
}
