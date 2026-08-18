/**
 * The Path of Pain mark: a switchback climb toward a lit ember.
 *
 * Geometry is shared with the generated app icons in
 * `apps/web/scripts/generate-icons.mjs` — change both together.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="74 74 364 364"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g transform="translate(0 -6)">
        <path
          d="M108 404 L200 404 L200 316 L292 316 L292 228 L384 228"
          stroke="currentColor"
          strokeWidth={44}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={384} cy={140} r={42} fill="var(--accent)" />
      </g>
    </svg>
  );
}
