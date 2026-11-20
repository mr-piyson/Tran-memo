import type { SVGProps } from "react";

export interface LogoProps extends SVGProps<SVGSVGElement> {
  /**
   * Any CSS colour: hex, rgb(), hsl(), oklch(), `currentColor`
   * or `var(--primary-color)`. Shades are derived by the browser with
   * `color-mix()`, so CSS variables finally work.
   */
  primaryColor?: string;
  /** Accessible name. Pass "" to mark the logo as purely decorative. */
  title?: string;
}

/**
 * Deterministic, SSR-safe id suffix: two logos with the same colour share the
 * same gradients (correct), two logos with different colours never clash.
 * The old hard-coded `paint0_linear` ids made the 2nd logo reuse the 1st palette.
 */
function hashId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export default function Logo({
  primaryColor = "var(--primary-color, #0072a5)",
  title = "Diamond",
  width = "100%",
  height = "100%",
  className,
  ...props
}: LogoProps) {
  const uid = hashId(primaryColor);
  const gid = (name: string) => `diamond-${uid}-${name}`;

  // `color-mix(in oklch, …)` scales lightness while preserving hue/chroma —
  // unlike the old `l - 30` / `s - 20` maths that collapsed to grey or white.
  const shade = (blackPct: number) =>
    `color-mix(in oklch, ${primaryColor}, black ${blackPct}%)`;
  const tint = (whitePct: number) =>
    `color-mix(in oklch, ${primaryColor}, white ${whitePct}%)`;

  const c = {
    sparkle: tint(72),   // near-white, top highlight
    light:   tint(45),   // lit crown facet
    soft:    tint(25),   // gently lit
    base:    primaryColor,
    darker:  shade(28),  // shadow
    darkest: shade(45),  // deepest shadow at the culet
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 186 249"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}

      <defs>
        {/* crown · outer left: bright top → brand colour at the girdle */}
        <linearGradient id={gid("crown")} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="1" stopColor={c.base} />
        </linearGradient>

        {/* table: lit top edge fading into the brand colour */}
        <linearGradient id={gid("table")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.soft} />
          <stop offset="1" stopColor={c.base} />
        </linearGradient>

        {/* pavilion · right: brand colour at the girdle → shadow at the culet */}
        <linearGradient id={gid("pavilion")} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.base} />
          <stop offset="1" stopColor={c.darker} />
        </linearGradient>
      </defs>

      {/* crown · outer left */}
      <path d="M99,0 L0,155.5 L65.5,101 Z" fill={`url(#${gid("crown")})`} />
      {/* crown · top highlight */}
      <path d="M95,95.5 L65.5,101 L99,0 Z" fill={c.sparkle} />
      {/* crown · inner left */}
      <path d="M95,95.5 L65.5,101 L0,155.5 Z" fill={c.base} />
      {/* table */}
      <path d="M95,95.5 L0,155.5 L185.5,95.5 Z" fill={`url(#${gid("table")})`} />
      {/* pavilion · left */}
      <path d="M91,155.5 L185.5,95.5 L0,155.5 Z" fill={c.darker} />
      {/* pavilion · right, large */}
      <path d="M87.5,249 L121,149.5 L185.5,95.5 Z" fill={`url(#${gid("pavilion")})`} />
      {/* pavilion · bottom point (culet) */}
      <path d="M91,155.5 L121,149.5 L87.5,249 Z" fill={c.darkest} />
      {/* pavilion · inner right rim light */}
      <path d="M91,155.5 L121,149.5 L185.5,95.5 Z" fill={c.soft} />
    </svg>
  );
}