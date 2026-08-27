export function AtlasMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="atlas-mark" aria-label="Sohel Islam Imran">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" />
        <path d="M12 30 22 9l10 21M16 24h12M22 9v25" />
        <circle cx="22" cy="9" r="2.2" />
      </svg>
      {!compact && <span className="atlas-mark__name">Sohel Islam Imran</span>}
    </span>
  );
}
