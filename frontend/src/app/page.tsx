import { BedDouble, Building2, CheckCircle2, FileText, ShieldCheck, Users, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

const features = [
  {
    icon: Building2,
    title: "All your branches, one login",
    body: "Add every hostel location you run. See occupancy, dues and collections for each branch side by side.",
  },
  {
    icon: BedDouble,
    title: "Rooms & beds",
    body: "Single, double, triple or dorm. Know which beds are free at a glance and assign students in seconds.",
  },
  {
    icon: Users,
    title: "Complete student records",
    body: "Contact, college, guardian, ID proof, blood group, joining date, deposit. Everything a warden needs, searchable.",
  },
  {
    icon: UtensilsCrossed,
    title: "Mess management",
    body: "Plan the weekly menu, offer meal plans, see who's subscribed and track every kitchen expense.",
  },
  {
    icon: FileText,
    title: "Invoices & payments",
    body: "Bill a whole branch for rent and mess in one click. Record UPI, cash or bank payments, then print or save as PDF.",
  },
  {
    icon: ShieldCheck,
    title: "Team access",
    body: "Give wardens and accountants their own login, limited to their branch if you like. Your data stays private to you.",
  },
];

export default function Landing() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="#features" className="hidden px-3 text-sm font-medium text-ink-600 hover:text-ink-900 sm:block">
              Features
            </Link>
            <ButtonLink href="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Get started</ButtonLink>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-linear-to-b from-brand-50 to-white" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="size-1.5 rounded-full bg-brand-500" /> Built for multi-branch hostel owners
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              Run every hostel you own from <span className="text-brand-600">one screen.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-600">
              Students, rooms, mess and invoices for all your branches across the city. No more registers, spreadsheets or chasing payments on WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="px-5 py-3 text-base">
                Register your hostel, it&apos;s free
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="px-5 py-3 text-base">
                Try the demo
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              {["Unlimited branches", "GST-ready invoices", "Works on mobile"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/illustrations/hero.svg" alt="Illustration of two hostel buildings with a student card and a paid invoice" className="w-full" />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-700">Everything in one place</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">From admission to the last rupee collected</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 p-6 transition-shadow hover:shadow-lg hover:shadow-ink-900/5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-3">
          {[
            ["1", "Register & add branches", "Create your account, then add each hostel location with its rooms and rent."],
            ["2", "Admit students", "Record each student's details, assign a bed and pick their mess plan."],
            ["3", "Bill & collect", "Run monthly billing for a branch, share the invoice, record payments as they come in."],
          ].map(([n, t, b]) => (
            <div key={n}>
              <span className="grid size-10 place-items-center rounded-full bg-brand-500 font-display font-bold">{n}</span>
              <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-ink-300">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-center rounded-3xl bg-brand-600 px-6 py-14 text-center text-white">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready to put your hostels on autopilot?</h2>
          <p className="mt-3 max-w-xl text-brand-50/90">Set up takes about five minutes. Bring your student list and start billing this month.</p>
          <ButtonLink href="/signup" variant="secondary" className="mt-8 px-6 py-3 text-base">
            Create your free account
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-500 sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} HostelCare. All illustrations are original.</p>
        </div>
      </footer>
    </div>
  );
}
