import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/illustrations/auth.svg" alt="" className="w-full max-w-md" />
        <div className="mt-6 max-w-md text-center text-brand-50">
          <p className="font-display text-2xl font-bold">Every branch. Every bed. Every rupee.</p>
          <p className="mt-2 text-brand-100/80">
            Students, rooms, mess and invoices for all your hostels in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
