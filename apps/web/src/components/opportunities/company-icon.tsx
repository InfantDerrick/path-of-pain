"use client";

import { useState } from "react";

export function CompanyIcon({
  src,
  name,
  size = "md",
}: {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const sizes = {
    sm: "size-9 text-xs",
    md: "size-11 text-sm",
    lg: "size-14 text-base",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel-soft font-semibold text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] ${sizes[size]}`}
      aria-hidden="true"
    >
      {src && !failed ? (
        // biome-ignore lint/performance/noImgElement: Supports arbitrary user-supplied icon URLs and local paths.
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </span>
  );
}
