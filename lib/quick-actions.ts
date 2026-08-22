/**
 * What a Quick Action opens.
 *
 * The four pills on the dashboard are named after acts — "Register Student",
 * "Record Payment" — and each one used to drop the person on the section's
 * list screen, where they still had to find the button that does the thing.
 * A shortcut that only shortens half the journey is a tab with extra steps.
 *
 * So the link carries the act with it: `/students?new=` means "students, with
 * the registration form open". One query, read by every section that has
 * something to create, rather than a bespoke flag per page.
 */

/** The query a section reads as "open your create form". */
export const CREATE_PARAM = "new";

/**
 * A link to a section with its create form already open.
 *
 * `prefill` is for the sections whose form has an obvious first field — the
 * desk types a name into the dashboard search, finds nobody, and registers
 * them without typing it again.
 */
export function createHref(section: string, prefill = ""): string {
  return `/${section}?${CREATE_PARAM}=${encodeURIComponent(prefill)}`;
}

/**
 * Whether the section that was navigated to should open its create form.
 *
 * Present-but-empty is the whole point: `?new=` is a request with nothing
 * typed yet, and an empty string is falsy, so asking `if (param)` here would
 * silently land every quick action back on the list it was meant to skip.
 */
export function opensCreate(param: string | undefined): boolean {
  return param !== undefined;
}

/** What `opensCreate` will be told, for a link `createHref` produced. */
export function createParamOf(href: string): string | undefined {
  const query = href.indexOf("?");
  if (query < 0) return undefined;
  const value = new URLSearchParams(href.slice(query + 1)).get(CREATE_PARAM);
  return value === null ? undefined : value;
}
