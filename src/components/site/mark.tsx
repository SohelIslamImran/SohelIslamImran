export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16" cy="16" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M23.1 9.2l2.3-1.5" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
