import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PHASE_MS = 4000;
const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

const PHASES = [
  { label: "Inhale", sub: "Quietly through your nose" },
  { label: "Hold", sub: "Soft and steady" },
  { label: "Exhale", sub: "Let the shoulders drop" },
  { label: "Hold", sub: "Rest at empty" },
] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

async function reverseGeocode(
  lat: number,
  lon: number,
  proxyBase: string,
): Promise<string | null> {
  const base = proxyBase.replace(/\/$/, "");
  const url = `${base}/api/mapbox?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ place_name?: string; text?: string }>;
  };
  const name = data.features?.[0]?.place_name ?? data.features?.[0]?.text;
  return name ?? null;
}

export default function App() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "pending" | "ok" | "denied" | "unavailable"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const proxyBase =
    import.meta.env.VITE_MAP_PROXY_URL?.trim() || "http://localhost:5000";

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const refreshLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }
    setLocationStatus("pending");
    setLocationLabel(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocationStatus("ok");
        try {
          const place = await reverseGeocode(lat, lon, proxyBase);
          setLocationLabel(
            place ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
          );
        } catch {
          setLocationLabel(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
        }
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    );
  }, [proxyBase]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const phase = PHASES[phaseIndex];
  const scale =
    phaseIndex === 0 ? 1.1 : phaseIndex === 2 ? 0.9 : 1;

  const locationMessage =
    locationStatus === "idle" || locationStatus === "pending"
      ? "Finding your spot…"
      : locationStatus === "denied"
        ? "Location off — breathing guide still works."
        : locationStatus === "unavailable"
          ? "This browser can't share location."
          : locationLabel ?? "Place name unavailable.";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% -15%, var(--breath-glow), transparent 55%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-[28rem] flex-col px-6 pb-12 pt-14 md:max-w-[32rem] md:px-8 md:pt-16">
        <header className="max-w-[28ch] animate-fade-in">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            BreathEasyAI
          </p>
          <h1 className="font-display mt-5 text-[clamp(1.75rem,6vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-foreground">
            Box breathing, uncluttered.
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Four steps, four seconds each. For place labels, run the Mapbox
            proxy (
            <code className="rounded bg-muted px-1 py-px text-[0.8125rem] text-foreground">
              npm run server
            </code>
            ) with{" "}
            <code className="rounded bg-muted px-1 py-px text-[0.8125rem] text-foreground">
              MAPBOX_TOKEN
            </code>
            .
          </p>
        </header>

        <section
          className="mt-14 flex flex-1 flex-col items-stretch md:mt-16"
          aria-label="Breathing exercise"
        >
          <div className="flex flex-col items-center">
            <ol
              className="mb-10 flex w-full max-w-[17.5rem] justify-between gap-1"
              aria-label="Breathing steps"
            >
              {PHASES.map((p, i) => {
                const active = i === phaseIndex;
                return (
                  <li key={p.label + i} className="flex flex-1 flex-col items-center">
                    <span
                      className={cn(
                        "h-1.5 w-full max-w-[2.75rem] rounded-full transition-colors duration-200",
                        active
                          ? "bg-primary"
                          : "bg-muted",
                      )}
                      aria-current={active ? "step" : undefined}
                    />
                    <span
                      className={cn(
                        "mt-2.5 hidden text-center text-[0.65rem] font-medium uppercase tracking-wider sm:block",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {p.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div
              className="relative flex h-[min(17.5rem,70vw)] w-[min(17.5rem,70vw)] items-center justify-center"
              role="img"
              aria-live="polite"
              aria-label={`${phase.label}. ${phase.sub}.`}
            >
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 200 200"
                aria-hidden
              >
                <circle
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="3"
                />
                <circle
                  key={phaseIndex}
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={reducedMotion ? 0 : RING_C}
                >
                  {!reducedMotion && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from={RING_C}
                      to={0}
                      dur={`${PHASE_MS / 1000}s`}
                      repeatCount={1}
                      fill="freeze"
                      calcMode="linear"
                    />
                  )}
                </circle>
              </svg>

              <div
                className="absolute rounded-full bg-[var(--breath-glow)] blur-2xl"
                style={{
                  width: "72%",
                  height: "72%",
                  transform: `scale(${scale})`,
                  transition: reducedMotion
                    ? "none"
                    : "transform 4s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                aria-hidden
              />

              <div
                className="relative flex aspect-square w-[62%] flex-col items-center justify-center rounded-full border border-[var(--surface-line)] bg-card text-center shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_6%,transparent)]"
                style={{
                  transform: `scale(${scale})`,
                  transition: reducedMotion
                    ? "none"
                    : "transform 4s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                <p className="font-display text-lg font-semibold text-foreground md:text-xl">
                  {phase.label}
                </p>
                <p className="mt-2 max-w-[14ch] px-2 text-sm leading-snug text-muted-foreground">
                  {phase.sub}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 border-t border-[var(--surface-line)] pt-8 md:mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Where you are
              </h2>
              <button
                type="button"
                onClick={refreshLocation}
                className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-primary underline decoration-[var(--surface-line)] underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Refresh
              </button>
            </div>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {locationMessage}
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-[var(--surface-line)] pt-6 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
          Wellness aid only — not medical advice.
        </footer>
      </div>
    </div>
  );
}
