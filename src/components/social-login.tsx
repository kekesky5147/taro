"use client";

import { useState } from "react";
import { Music } from "lucide-react";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.34 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C43.98 37.98 48 32.04 48 24c0-1.64-.14-3.23-.41-4.77l-.61.32z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.62-13.47-8.37l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.35-1.09-.55-2.09-.52-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.06 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <Music
      className={`shrink-0 text-[#1DB954] ${className ?? ""}`}
      strokeWidth={1.75}
      size={22}
      aria-hidden
    />
  );
}

export interface SocialLoginProps {
  onLogin: () => void;
  /** Close sheet / modal without signing in */
  onDismiss?: () => void;
  /** `gate` = bottom sheet / modal for post-draw sign-in */
  variant?: "gate" | "legacy";
}

export function SocialLogin({
  onLogin,
  onDismiss,
  variant = "gate",
}: SocialLoginProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (variant === "legacy") {
    return (
      <div className="mx-auto w-full max-w-sm px-4">
        <div className="glass space-y-3 rounded-2xl p-6">
          <p className="mb-4 text-center text-sm tracking-wide text-muted-foreground">
            Begin your cosmic journey
          </p>
          <AuthRows onLogin={onLogin} hovered={hovered} setHovered={setHovered} showSpotify />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-t-3xl border border-white/10 bg-[oklch(0.1_0.03_280/0.92)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:rounded-3xl sm:border-white/10">
      <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />
      <p className="text-center font-serif text-lg tracking-wide text-foreground">Align your account</p>
      <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground/75">
        Save readings, sync across devices, and unlock the full spread.
      </p>
      <div className="mt-6 space-y-2.5">
        <AuthRows onLogin={onLogin} hovered={hovered} setHovered={setHovered} showSpotify={false} />
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full py-2 text-center text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground/85"
        >
          Not now — keep exploring as a guest
        </button>
      )}
      <div className="mt-4 flex justify-center gap-4 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={onLogin}
          className="flex items-center gap-2 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <SpotifyGlyph className="h-4 w-4" />
          <span className="underline decoration-white/15 underline-offset-2">Spotify</span>
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] text-muted-foreground/45">
        By continuing you agree to our terms &amp; privacy.
      </p>
    </div>
  );
}

function AuthRows({
  onLogin,
  hovered,
  setHovered,
  showSpotify,
}: {
  onLogin: () => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  showSpotify?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onLogin}
        onMouseEnter={() => setHovered("apple")}
        onMouseLeave={() => setHovered(null)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:border-white/18 hover:bg-white/[0.07]"
        style={{
          boxShadow:
            hovered === "apple"
              ? "0 0 0 1px oklch(1 0 0 / 0.12), 0 8px 28px oklch(0 0 0 / 0.35)"
              : undefined,
        }}
      >
        <AppleGlyph className="h-[22px] w-[22px] shrink-0 text-white" />
        <span className="text-sm font-medium tracking-wide text-foreground/95">Continue with Apple</span>
      </button>
      <button
        type="button"
        onClick={onLogin}
        onMouseEnter={() => setHovered("google")}
        onMouseLeave={() => setHovered(null)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:border-white/18 hover:bg-white/[0.07]"
        style={{
          boxShadow:
            hovered === "google"
              ? "0 0 0 1px oklch(0.65 0.12 260 / 0.25), 0 8px 28px oklch(0 0 0 / 0.35)"
              : undefined,
        }}
      >
        <GoogleGlyph className="h-[22px] w-[22px] shrink-0" />
        <span className="text-sm font-medium tracking-wide text-foreground/95">Continue with Google</span>
      </button>
      {showSpotify && (
        <button
          type="button"
          onClick={onLogin}
          onMouseEnter={() => setHovered("spotify")}
          onMouseLeave={() => setHovered(null)}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:border-white/18 hover:bg-white/[0.07]"
        >
          <SpotifyGlyph className="h-[22px] w-[22px] shrink-0" />
          <span className="text-sm font-medium tracking-wide text-foreground/95">Continue with Spotify</span>
        </button>
      )}
    </>
  );
}
