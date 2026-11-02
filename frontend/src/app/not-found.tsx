import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/illustrations/empty.svg" alt="" className="h-32" />
      <h1 className="mt-4 font-display text-2xl font-bold">Not found</h1>
      <p className="mt-1 text-ink-500">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <ButtonLink href="/app" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
