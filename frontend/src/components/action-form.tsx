"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, Notice } from "./ui";

export type FormState = { error?: string; success?: string; nonce?: number } | undefined;
export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A <form> wired to a server action with inline error/success messages.
 * Actions return { error } to show a message, or call redirect() on success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.success) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error && (
        <div className="mb-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {state?.success && (
        <div className="mb-4">
          <Notice tone="success">{state.success}</Notice>
        </div>
      )}
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function ConfirmButton({
  children,
  message,
  variant = "danger",
  className,
}: {
  children: ReactNode;
  message: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
