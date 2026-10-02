"use client";

/* A tournament's banner, as the console shows it: on the tournament's own
 * screen, on its card in the list, and in the create wizard beside the upload.
 *
 * The organiser's own picture when they uploaded one; otherwise one drawn from
 * the tournament — the school's logo and name, the event's name, when and
 * where — so every event has its own. The public registration page and the
 * parent's card draw the same design in jtrax-web-app
 * (components/public/TournamentBanner.tsx); keep the two in step.
 *
 * A 3:1 box never taller than 223px, with the text sized by its height
 * (`cqh`), so a long name wraps to two lines the same way in a 300px card
 * and across a wide page.
 */
import { Icon } from "@/lib/icons";
import { FONT } from "@/lib/theme";

export function TournamentBanner({
  name,
  when,
  venue,
  imageUrl,
  height,
  radius = 12,
}: {
  name: string;
  when?: string;
  venue?: string;
  /** The uploaded banner, or a local preview of one about to be. */
  imageUrl?: string;
  /** Fixed height; left out, the banner is 3:1 and never taller than 223px. */
  height?: number;
  radius?: number;
}) {
  const box: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    borderRadius: radius,
    flexShrink: 0,
    /* The box decides the size, never the picture: a tall upload is cropped
       to it (cover), not allowed to push the page down. */
    ...(height ? { height } : { aspectRatio: "3 / 1", maxHeight: 223 }),
  };
  if (imageUrl) {
    return (
      <div style={{ ...box, background: "#1e3a70" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the API or a local blob */}
        <img src={imageUrl} alt={name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const piece = (src: string, style: React.CSSProperties) => (
    // eslint-disable-next-line @next/next/no-img-element -- decoration, a fixed file
    <img aria-hidden alt="" src={src} style={{ position: "absolute", filter: "brightness(0) invert(1)", ...style }} />
  );
  return (
    <div
      role="img"
      aria-label={[name, when, venue].filter(Boolean).join(" · ")}
      style={{
        ...box,
        /* Sized by the box's height (cqh), which is capped, so the text
           never outgrows a banner that stopped growing at 223px. */
        containerType: "size",
        color: "#fff",
        fontFamily: FONT,
        background: "linear-gradient(118deg, #0f2350 0%, #1b3c85 52%, #2e5cb8 100%)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, bottom: 0, right: 0, width: "62%",
          backgroundImage: "repeating-conic-gradient(rgba(255,255,255,.075) 0% 25%, transparent 0% 50%)",
          backgroundSize: "12cqh 12cqh",
          maskImage: "linear-gradient(to left, #000 15%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to left, #000 15%, transparent 95%)",
        }}
      />
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 90% at 88% 0%, rgba(133,170,238,.35), transparent 70%)" }}
      />
      {piece("/pieces/ln.svg", { right: "3cqw", bottom: "-16cqh", height: "112cqh", opacity: 0.16 })}
      {piece("/pieces/lk.svg", { right: "calc(3cqw + 70cqh)", bottom: "-10cqh", height: "58cqh", opacity: 0.08 })}
      <div
        aria-hidden
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)" }}
      />
      <div
        style={{
          position: "relative", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "8cqh 5cqw", gap: "4.5cqh", maxWidth: "72%", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4cqh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed file */}
          <img
            src="/jca-logo.png"
            alt=""
            aria-hidden
            style={{
              width: "max(20px, 16cqh)", height: "max(20px, 16cqh)", borderRadius: "50%",
              background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.25)", flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "max(8px, 4.4cqh)", fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", opacity: 0.9 }}>
            JCA Chess School
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "max(14px, 12cqh)",
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            textWrap: "balance",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 2px 12px rgba(0,0,0,.18)",
          }}
        >
          {name}
        </p>
        {(when || venue) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.5cqh 6cqh", fontSize: "max(10px, 5.2cqh)", fontWeight: 600 }}>
            {when && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "2cqh" }}>
                <Icon name="calendar" size={13} color="rgba(255,255,255,.85)" />
                {when}
              </span>
            )}
            {venue && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "2cqh", minWidth: 0 }}>
                <Icon name="pin" size={13} color="rgba(255,255,255,.85)" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venue}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
