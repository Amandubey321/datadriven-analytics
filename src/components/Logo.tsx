export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--saffron)" />
      <rect x="7" y="17" width="4" height="8" rx="1" fill="var(--sidebar)" />
      <rect x="14" y="12" width="4" height="13" rx="1" fill="var(--sidebar)" />
      <rect x="21" y="7" width="4" height="18" rx="1" fill="var(--sidebar)" />
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--sidebar)" strokeOpacity=".25" />
    </svg>
  );
}
