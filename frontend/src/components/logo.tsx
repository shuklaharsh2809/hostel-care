export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0f856c" />
        <path d="M7 15.5 16 8l9 7.5V24a1 1 0 0 1-1 1h-5.5v-6h-5v6H8a1 1 0 0 1-1-1z" fill="#fff" />
        <circle cx="16" cy="15" r="1.8" fill="#fbbf4a" />
      </svg>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink-900"}`}>
        Hostel<span className="text-brand-600">Care</span>
      </span>
    </span>
  );
}
