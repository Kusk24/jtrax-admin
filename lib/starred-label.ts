/** For tests: a label as written, with or without the " *" a required
    field's label carries (page-kit's Req, crud.tsx), and nothing else. */
export function starred(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( \\*)?$`);
}
