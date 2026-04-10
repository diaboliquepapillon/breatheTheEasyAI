import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Wind } from "lucide-react";

const PHASE_MS = 4000;
const PHASES = [
  { label: "Breathe in", sub: "through your nose" },
  { label: "Hold", sub: "gently" },
  { label: "Breathe out", sub: "slowly" },
  { label: "Hold", sub: "stay easy" },
] as const;

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
    phaseIndex === 0 ? 1.12 : phaseIndex === 2 ? 0.92 : 1;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-50 via-background to-cyan-50/80 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-10 pt-12">
        <header className="animate-fade-in mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Wind className="h-4 w-4" aria-hidden />
              BreathEasyAI
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Calm breath, clearer air
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A short box-breathing session. Grant location to optionally label
              your area via the Mapbox proxy—run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run server
              </code>{" "}
              with{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                MAPBOX_TOKEN
              </code>{" "}
              set.
            </p>
          </div>
        </header>

        <section
          className="flex flex-1 flex-col items-center justify-center gap-10"
          aria-label="Breathing exercise"
        >
          <div
            className="relative flex h-56 w-56 items-center justify-center"
            role="img"
            aria-live="polite"
            aria-label={`${phase.label}. ${phase.sub}.`}
          >
            <div
              className="absolute inset-0 rounded-full bg-primary/15 blur-2xl"
              style={{
                transform: `scale(${scale})`,
                transition: "transform 4s ease-in-out",
              }}
            />
            <div
              className={cn(
                "relative flex h-44 w-44 items-center justify-center rounded-full border-2 border-primary/40 bg-card/80 shadow-lg backdrop-blur-sm",
              )}
              style={{
                transform: `scale(${scale})`,
                transition: "transform 4s ease-in-out",
              }}
            >
              <div className="px-6 text-center">
                <p className="text-lg font-medium text-foreground">
                  {phase.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {phase.sub}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Your area</p>
              <button
                type="button"
                onClick={refreshLocation}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Refresh
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {locationStatus === "idle" || locationStatus === "pending"
                ? "Locating…"
                : locationStatus === "denied"
                  ? "Location permission denied. You can still use the breathing guide."
                  : locationStatus === "unavailable"
                    ? "Geolocation not available in this browser."
                    : locationLabel ?? "Could not resolve a place name."}
            </p>
          </div>
        </section>

        <footer className="mt-auto pt-8 text-center text-xs text-muted-foreground">
          Each phase lasts four seconds—inhale, hold, exhale, hold. Not medical
          advice.
        </footer>
      </div>
    </div>
  );
}
