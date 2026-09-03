"use client";

/**
 * You, and the one thing on this console that is only yours.
 *
 * Split off Settings, which had grown into four unrelated blocks on one scroll:
 * the academy's credit rules, its LINE credentials, its staff accounts — and
 * the theme, which is none of those. The page's own comment already named the
 * line: *the theme belongs to whoever is signed in, but who can sign in is the
 * office's to decide.* That sentence is the split.
 *
 * The parent portal draws it the same way and was the model asked for: Profile
 * is who you are, Settings is what the academy runs on.
 *
 * It matters most for the receptionist. Settings was open to them for the sake
 * of that one theme card, and everything else on the page was gated — so they
 * opened a screen named after the academy's configuration and found a single
 * control. Now the page they can open is theirs entirely, and Settings is not
 * in their nav at all.
 */
import { useTranslations } from "next-intl";
import { Icon } from "@/lib/icons";
import { COLORS, FONT, ROLE_COLORS } from "@/lib/theme";
import { useJtrax } from "../JtraxContext";
import { InfoGrid, PageHeader } from "../page-kit";
import { ThemeToggle } from "../ThemeToggle";
import { Avatar, Badge, Card, SectionTitle } from "../ui";

export function ProfilePage() {
  const { person, role } = useJtrax();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("roles");
  const roleColor = ROLE_COLORS[role];

  /* A staff account signs in with an email — only the children use a bare ID
     ([[a-child-signs-in-with-an-id]]) — so this row is always an address, and
     is labelled as one. It is read-only here: an address is the account's own
     record, and changing it is the same act as handing the account to somebody
     else, which lives on the staff list under an admin's hand. */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
      <PageHeader title={t("pageTitle")} sub={t("sub")} />

      <Card style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Avatar initials={person.initials} size={54} />
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: COLORS.text }}>
            {person.name}
          </div>
          <div style={{ marginTop: 6 }}>
            <Badge color={roleColor.color} bg={roleColor.bg}>{tRole(role)}</Badge>
          </div>
        </div>
      </Card>

      <SectionTitle>{t("accountTitle")}</SectionTitle>
      <Card>
        <InfoGrid
          rows={[
            { label: t("signInEmail"), value: person.email || "—" },
            { label: tCommon("phone"), value: person.phone || "—" },
            { label: tCommon("branch"), value: person.branch || "—" },
          ]}
        />
        {/* Said rather than left to be discovered by clicking something that
            is not there. A member of staff who needs a new password uses the
            sign-in page's own Forgot-password link, or asks an admin — the
            console has never had a change-it-here field, and a profile page
            is exactly where somebody would look for one. */}
        <p style={{ margin: "12px 0 0", fontFamily: FONT, fontSize: 12.5, color: COLORS.textSecondary }}>
          {t("passwordHint")}
        </p>
      </Card>

      {/* The reason this page exists: a preference that is yours, on a page
          that is yours. It used to sit under the academy's rules. */}
      <SectionTitle>{t("appearanceTitle")}</SectionTitle>
      <Card style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: COLORS.light,
            flexShrink: 0,
          }}
        >
          <Icon name="settings" size={18} color={COLORS.blue} />
        </span>
        {/* The section heading above already says Appearance; repeating it
            on the card stacked the same word twice. The card carries what the
            heading cannot — what the choice actually does. */}
        <p style={{ flex: "1 1 260px", minWidth: 0, margin: 0, fontFamily: FONT, fontSize: 13.5, color: COLORS.textSecondary }}>
          {t("appearanceDesc")}
        </p>
        <ThemeToggle />
      </Card>
    </div>
  );
}
