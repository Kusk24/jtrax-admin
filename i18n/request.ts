import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'th'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get('locale')?.value;
  const locale: Locale = cookieLocale === 'th' ? 'th' : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
