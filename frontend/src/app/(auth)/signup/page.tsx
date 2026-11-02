import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "../actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Register your hostel" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Register your hostel</h1>
      <p className="mt-2 text-ink-500">Set up your business and first branch. You can add more branches later.</p>
      <ActionForm action={signup} className="mt-8 space-y-4">
        <Field label="Hostel / business name">
          <Input name="hostelName" required placeholder="e.g. Sunrise Hostels" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First branch name">
            <Input name="branchName" required placeholder="e.g. Kothrud Boys Hostel" />
          </Field>
          <Field label="City">
            <Input name="city" placeholder="e.g. Pune" />
          </Field>
        </div>
        <hr className="border-ink-100" />
        <Field label="Your name">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <SubmitButton className="w-full py-2.5" pendingText="Creating your account…">
          Create account
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
