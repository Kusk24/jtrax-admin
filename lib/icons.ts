/**
 * Icon set ported from the `ICON_DATA` table in `JTRAX Dashboard.dc.html`.
 *
 * The mockup ships its own hand-drawn 24px stroke icons rather than using
 * lucide-react like the rest of the admin app, and several of them (the chess
 * pieces, the LINE-style chat bubble) have no lucide equivalent — so the set is
 * ported as-is to keep the JTRAX tree visually faithful.
 */
import type { CSSProperties, ReactElement } from "react";
import { createElement } from "react";

type IconPart = [string, Record<string, string | number>];

const ICON_DATA = {
  "home": [
    ["path", { "d": "M3 11.5L12 4l9 7.5" }],
    ["path", { "d": "M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" }],
  ],
  "history": [
    ["circle", { "cx": 12, "cy": 12, "r": 9 }],
    ["path", { "d": "M12 7v5l3.5 2" }],
  ],
  "students": [
    ["circle", { "cx": 9, "cy": 8, "r": 3 }],
    ["path", { "d": "M3.5 20a5.5 5.5 0 0 1 11 0" }],
    ["circle", { "cx": 17, "cy": 9, "r": 2.5 }],
    ["path", { "d": "M14.8 13.2A4.5 4.5 0 0 1 20.5 20" }],
  ],
  /* Two adults of equal size — `students` is the same pair with the second
     figure drawn smaller, which is what reads as "child" there. */
  "parents": [
    ["circle", { "cx": 8, "cy": 8, "r": 3 }],
    ["path", { "d": "M2.5 20a5.5 5.5 0 0 1 11 0" }],
    ["circle", { "cx": 16.5, "cy": 8, "r": 3 }],
    ["path", { "d": "M13.6 13.6A5.5 5.5 0 0 1 21.5 20" }],
  ],
  "payment": [
    ["rect", { "x": 2.5, "y": 5.5, "width": 19, "height": 13, "rx": 2 }],
    ["line", { "x1": 2.5, "y1": 10, "x2": 21.5, "y2": 10 }],
  ],
  "tournament": [
    ["path", { "d": "M8 4h8v3a4 4 0 0 1-8 0V4Z" }],
    ["path", { "d": "M8 5H5a3 3 0 0 0 3 5" }],
    ["path", { "d": "M16 5h3a3 3 0 0 1-3 5" }],
    ["path", { "d": "M12 12v3" }],
    ["path", { "d": "M9 19h6" }],
    ["path", { "d": "M10 15h4v4h-4z" }],
  ],
  "announcement": [
    ["path", { "d": "M4 10.5v3a1 1 0 0 0 1 1h1.2l6.3 3.4a.6.6 0 0 0 .9-.5V6.6a.6.6 0 0 0-.9-.5L6.2 9.5H5a1 1 0 0 0-1 1Z" }],
    ["rect", { "x": 3, "y": 10.5, "width": 1.6, "height": 3, "rx": 0.6 }],
    ["path", { "d": "M15 9c1.3 1 1.3 5 0 6" }],
  ],
  "chat": [
    ["path", { "d": "M21 11.5a8.38 8.38 0 0 1-8.5 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-5.6a8.4 8.4 0 1 1 16.9-2.9Z" }],
  ],
  "search": [
    ["circle", { "cx": 11, "cy": 11, "r": 7 }],
    ["line", { "x1": 21, "y1": 21, "x2": 16.5, "y2": 16.5 }],
  ],
  "chevronRight": [
    ["path", { "d": "M9 6l6 6-6 6" }],
  ],
  "chevronLeft": [
    ["path", { "d": "M15 6l-6 6 6 6" }],
  ],
  "chevronDown": [
    ["path", { "d": "M6 9l6 6 6-6" }],
  ],
  "alertTriangle": [
    ["path", { "d": "M12 3.5 21.5 20h-19L12 3.5Z" }],
    ["line", { "x1": 12, "y1": 9.5, "x2": 12, "y2": 13.5 }],
    ["line", { "x1": 12, "y1": 16.6, "x2": 12, "y2": 16.6 }],
  ],
  "clockSmall": [
    ["circle", { "cx": 12, "cy": 12, "r": 9 }],
    ["path", { "d": "M12 7.5v5l3 1.8" }],
  ],
  "userX": [
    ["circle", { "cx": 10, "cy": 8, "r": 3.5 }],
    ["path", { "d": "M4 20a6 6 0 0 1 12 0" }],
    ["line", { "x1": 17, "y1": 8, "x2": 21, "y2": 12 }],
    ["line", { "x1": 21, "y1": 8, "x2": 17, "y2": 12 }],
  ],
  "wallet": [
    ["path", { "d": "M3.5 7.5A1.5 1.5 0 0 1 5 6h13.5A1.5 1.5 0 0 1 20 7.5v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17.5Z" }],
    ["path", { "d": "M3.5 10.5h16" }],
    ["circle", { "cx": 16, "cy": 14, "r": 1, "fill": "currentColor", "stroke": "none" }],
  ],
  "usersPlus": [
    ["circle", { "cx": 9, "cy": 8, "r": 3.5 }],
    ["path", { "d": "M3 20a6 6 0 0 1 12 0" }],
    ["line", { "x1": 18, "y1": 8, "x2": 18, "y2": 14 }],
    ["line", { "x1": 15, "y1": 11, "x2": 21, "y2": 11 }],
  ],
  "fileText": [
    ["path", { "d": "M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" }],
    ["line", { "x1": 9, "y1": 12, "x2": 15, "y2": 12 }],
    ["line", { "x1": 9, "y1": 16, "x2": 15, "y2": 16 }],
  ],
  "send": [
    ["path", { "d": "M4 11l16-7-6 16-2.5-6.5L4 11Z" }],
  ],
  "paperclip": [
    ["path", { "d": "M17 7.5 9.5 15a3 3 0 1 1-4.2-4.2l8-8a2 2 0 1 1 2.8 2.8l-7.6 7.6a1 1 0 1 1-1.4-1.4L14 4.7" }],
  ],
  "plus": [
    ["line", { "x1": 12, "y1": 5, "x2": 12, "y2": 19 }],
    ["line", { "x1": 5, "y1": 12, "x2": 19, "y2": 12 }],
  ],
  "book": [
    ["path", { "d": "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" }],
    ["path", { "d": "M4 5.5v15" }],
  ],
  "king": [
    ["path", { "d": "M12 3v3" }],
    ["path", { "d": "M10.5 4.5h3" }],
    ["path", { "d": "M8 9c0-1 1.5-2 4-2s4 1 4 2l-1 7H9L8 9Z" }],
    ["rect", { "x": 7, "y": 18, "width": 10, "height": 2, "rx": 0.6 }],
  ],
  "queen": [
    ["path", { "d": "M6 9l1.8 3 4.2-4 4.2 4 1.8-3-1 7H7L6 9Z" }],
    ["circle", { "cx": 6, "cy": 9, "r": 1, "fill": "currentColor", "stroke": "none" }],
    ["circle", { "cx": 12, "cy": 8, "r": 1, "fill": "currentColor", "stroke": "none" }],
    ["circle", { "cx": 18, "cy": 9, "r": 1, "fill": "currentColor", "stroke": "none" }],
    ["rect", { "x": 7, "y": 18, "width": 10, "height": 2, "rx": 0.6 }],
  ],
  "pawn": [
    ["circle", { "cx": 12, "cy": 7.5, "r": 2.5 }],
    ["path", { "d": "M9 17c0-3 1.3-5 3-5s3 2 3 5" }],
    ["rect", { "x": 7, "y": 17, "width": 10, "height": 2, "rx": 0.6 }],
  ],
  "rook": [
    ["path", { "d": "M7 8V5h2v2h2V5h2v2h2V5h2v3l-1 2H8L7 8Z" }],
    ["path", { "d": "M8 10h8l1 8H7l1-8Z" }],
    ["rect", { "x": 6, "y": 18, "width": 12, "height": 2, "rx": 0.6 }],
  ],
  "knight": [
    ["path", { "d": "M8 19l1-6c.3-2 1-3.5 2.5-4.5L9 7c-.5-1 0-2.5 1.5-3 1.7 2 3.5 2 5 3 1.5 1 2 2.5 2 4.5v3l1 4.5H8Z" }],
    ["circle", { "cx": 12.2, "cy": 8, "r": 0.6, "fill": "currentColor", "stroke": "none" }],
    ["rect", { "x": 7, "y": 19, "width": 10, "height": 2, "rx": 0.6 }],
  ],
  "bishop": [
    ["path", { "d": "M12 3.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" }],
    ["path", { "d": "M9 15c0-4 1-6.5 3-8 2 1.5 3 4 3 8" }],
    ["path", { "d": "M8.5 15h7l.5 3H8l.5-3Z" }],
    ["rect", { "x": 7, "y": 19, "width": 10, "height": 2, "rx": 0.6 }],
  ],
  "logout": [
    ["path", { "d": "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" }],
    ["path", { "d": "M16 15l4-3-4-3" }],
    ["line", { "x1": 20, "y1": 12, "x2": 9, "y2": 12 }],
  ],
  "star": [
    ["path", { "d": "M12 4l2.4 5.1 5.6.7-4.1 3.9 1 5.6L12 16.6 7.1 19.3l1-5.6-4.1-3.9 5.6-.7Z" }],
  ],
  "pin": [
    ["path", { "d": "M12 3v6.5" }],
    ["path", { "d": "M8 9.5h8l1.2 4H6.8Z" }],
    ["path", { "d": "M12 13.5V21" }],
  ],
  "moreHorizontal": [
    ["circle", { "cx": 5, "cy": 12, "r": 1.3, "fill": "currentColor", "stroke": "none" }],
    ["circle", { "cx": 12, "cy": 12, "r": 1.3, "fill": "currentColor", "stroke": "none" }],
    ["circle", { "cx": 19, "cy": 12, "r": 1.3, "fill": "currentColor", "stroke": "none" }],
  ],
  "image": [
    ["rect", { "x": 3, "y": 4.5, "width": 18, "height": 15, "rx": 2 }],
    ["circle", { "cx": 8.5, "cy": 10, "r": 1.6 }],
    ["path", { "d": "M4 16.5 9 12l3.5 3.2L15.5 12 20 16.5" }],
  ],
  "bookmark": [
    ["path", { "d": "M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-3.6L5.5 21V4.5a1 1 0 0 1 1-1Z" }],
  ],
  "tag": [
    ["path", { "d": "M12.5 3.5H5.5a1 1 0 0 0-1 1v7l10 10 8-8-10-10Z" }],
    ["circle", { "cx": 8.2, "cy": 8.2, "r": 1.3, "fill": "currentColor", "stroke": "none" }],
  ],
  "userCheck": [
    ["circle", { "cx": 9, "cy": 8, "r": 3.5 }],
    ["path", { "d": "M3 20a6 6 0 0 1 12 0" }],
    ["path", { "d": "M16 12.5l2 2 4-4" }],
  ],
  "refund": [
    ["path", { "d": "M4 4v6h6" }],
    ["path", { "d": "M4.5 10A8 8 0 1 1 6 16.5" }],
  ],
  "phone": [
    ["path", { "d": "M6 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4.5 5.1 1.5 1.5 0 0 1 6 3.5Z" }],
  ],
  "smile": [
    ["circle", { "cx": 12, "cy": 12, "r": 9 }],
    ["path", { "d": "M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" }],
    ["circle", { "cx": 9, "cy": 9.5, "r": 0.9, "fill": "currentColor", "stroke": "none" }],
    ["circle", { "cx": 15, "cy": 9.5, "r": 0.9, "fill": "currentColor", "stroke": "none" }],
  ],
  "mail": [
    ["rect", { "x": 3, "y": 5, "width": 18, "height": 14, "rx": 2 }],
    ["path", { "d": "M3.5 6.5 12 13l8.5-6.5" }],
  ],
  "calendar": [
    ["rect", { "x": 3.5, "y": 4.5, "width": 17, "height": 16, "rx": 2 }],
    ["line", { "x1": 3.5, "y1": 9.5, "x2": 20.5, "y2": 9.5 }],
    ["line", { "x1": 8, "y1": 3, "x2": 8, "y2": 6.5 }],
    ["line", { "x1": 16, "y1": 3, "x2": 16, "y2": 6.5 }],
  ],
  "flame": [
    ["path", { "d": "M12 3s-1 2.5-1 4.5c0 1 .6 1.5 1.2 2A3.2 3.2 0 0 0 14 7c1.5 1.5 3 3.8 3 6.5a5 5 0 0 1-10 0c0-2 1-3.5 2-5 .3 1 1 2 2 2Z" }],
  ],
  "award": [
    ["circle", { "cx": 12, "cy": 9, "r": 5 }],
    ["path", { "d": "M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" }],
  ],
  "filter": [
    ["path", { "d": "M4 5h16" }],
    ["path", { "d": "M7 12h10" }],
    ["path", { "d": "M10 19h4" }],
  ],
  "x": [
    ["line", { "x1": 6, "y1": 6, "x2": 18, "y2": 18 }],
    ["line", { "x1": 18, "y1": 6, "x2": 6, "y2": 18 }],
  ],
  "trophy": [
    ["path", { "d": "M7 4h10v4a5 5 0 0 1-10 0V4Z" }],
    ["path", { "d": "M7 5H4a3 3 0 0 0 3 5" }],
    ["path", { "d": "M17 5h3a3 3 0 0 1-3 5" }],
    ["path", { "d": "M12 13v3" }],
    ["path", { "d": "M9 20h6" }],
    ["path", { "d": "M10 16h4v4h-4z" }],
  ],
  "download": [
    ["path", { "d": "M12 3.5v11" }],
    ["path", { "d": "M7.5 10.5 12 15l4.5-4.5" }],
    ["path", { "d": "M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2" }],
  ],
  "layers": [
    ["path", { "d": "M12 3.5 4 8l8 4.5L20 8Z" }],
    ["path", { "d": "M4 12.5l8 4.5 8-4.5" }],
    ["path", { "d": "M4 16.5l8 4.5 8-4.5" }],
  ],
  "heart": [
    ["path", { "d": "M12 20s-7-4.4-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z" }],
  ],
  "settings": [
    ["circle", { "cx": 12, "cy": 12, "r": 3 }],
    ["path", { "d": "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" }],
  ],
  "globe": [
    ["circle", { "cx": 12, "cy": 12, "r": 9 }],
    ["path", { "d": "M3 12h18" }],
    ["path", { "d": "M12 3c2.5 2.5 2.5 15.5 0 18" }],
    ["path", { "d": "M12 3c-2.5 2.5-2.5 15.5 0 18" }],
  ],
  "facebook": [
    ["circle", { "cx": 12, "cy": 12, "r": 9 }],
    ["path", { "d": "M13.5 16v-5h1.8l.3-2.2h-2.1v-1.4c0-.6.2-1 1.1-1h1.1V4.3c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.1-3.2 3.2v1.4H8.5V11h1.8v5Z" }],
  ],
  "instagram": [
    ["rect", { "x": 4, "y": 4, "width": 16, "height": 16, "rx": 4 }],
    ["circle", { "cx": 12, "cy": 12, "r": 3.5 }],
    ["circle", { "cx": 16.5, "cy": 7.5, "r": 0.8, "fill": "currentColor", "stroke": "none" }],
  ],
  "link": [
    ["path", { "d": "M9 15l6-6" }],
    ["path", { "d": "M11 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" }],
    ["path", { "d": "M13 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" }],
  ],
  "copy": [
    ["rect", { "x": 8, "y": 8, "width": 12, "height": 12, "rx": 2 }],
    ["path", { "d": "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" }],
  ],
  "check": [
    ["path", { "d": "M4.5 12.5l5 5 10-11" }],
  ],
  "edit": [
    ["path", { "d": "M14.5 4.5l5 5L8 21H3v-5L14.5 4.5Z" }],
    ["line", { "x1": 12.5, "y1": 6.5, "x2": 17.5, "y2": 11.5 }],
  ],
  /* Drawn in the same 24px stroke idiom as the rest of the set — lucide's
     trash sits at a different weight beside these. */
  "trash": [
    ["path", { "d": "M4 7h16" }],
    ["path", { "d": "M9.5 7V5h5v2" }],
    ["path", { "d": "M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7" }],
    ["line", { "x1": 10.5, "y1": 11, "x2": 10.5, "y2": 16.5 }],
    ["line", { "x1": 13.5, "y1": 11, "x2": 13.5, "y2": 16.5 }],
  ],
  "printer": [
    ["rect", { "x": 6, "y": 9, "width": 12, "height": 7, "rx": 1 }],
    ["path", { "d": "M7 9V4.5h10V9" }],
    ["path", { "d": "M7 16v3.5h10V16" }],
  ],
  "share": [
    ["circle", { "cx": 18, "cy": 6, "r": 2.3 }],
    ["circle", { "cx": 6, "cy": 12, "r": 2.3 }],
    ["circle", { "cx": 18, "cy": 18, "r": 2.3 }],
    ["line", { "x1": 8.1, "y1": 10.8, "x2": 15.9, "y2": 7.2 }],
    ["line", { "x1": 8.1, "y1": 13.2, "x2": 15.9, "y2": 16.8 }],
  ],
  "lock": [
    ["rect", { "x": 5, "y": 11, "width": 14, "height": 9, "rx": 1.5 }],
    ["path", { "d": "M8 11V7.5a4 4 0 0 1 8 0V11" }],
  ],
  /* The two list-view switches. `grid` is the card view, `list` the table —
     the same pair Teams and Drive use, so the control needs no label. */
  "grid": [
    ["rect", { "x": 4, "y": 4, "width": 7, "height": 7, "rx": 1.6 }],
    ["rect", { "x": 13, "y": 4, "width": 7, "height": 7, "rx": 1.6 }],
    ["rect", { "x": 4, "y": 13, "width": 7, "height": 7, "rx": 1.6 }],
    ["rect", { "x": 13, "y": 13, "width": 7, "height": 7, "rx": 1.6 }],
  ],
  /* The bullets are zero-length lines: round caps draw them as dots, which
     keeps the whole set stroke-only. */
  "list": [
    ["line", { "x1": 4.5, "y1": 6.5, "x2": 4.51, "y2": 6.5 }],
    ["line", { "x1": 9, "y1": 6.5, "x2": 20, "y2": 6.5 }],
    ["line", { "x1": 4.5, "y1": 12, "x2": 4.51, "y2": 12 }],
    ["line", { "x1": 9, "y1": 12, "x2": 20, "y2": 12 }],
    ["line", { "x1": 4.5, "y1": 17.5, "x2": 4.51, "y2": 17.5 }],
    ["line", { "x1": 9, "y1": 17.5, "x2": 20, "y2": 17.5 }],
  ],} satisfies Record<string, IconPart[]>;

export type IconName = keyof typeof ICON_DATA;

export function Icon({
  name,
  size = 18,
  color = "currentColor",
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}): ReactElement {
  const parts = ICON_DATA[name] ?? [];
  return createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style,
      "aria-hidden": true,
      focusable: false,
    },
    parts.map(([tag, props], i) => createElement(tag, { key: i, ...props })),
  );
}
