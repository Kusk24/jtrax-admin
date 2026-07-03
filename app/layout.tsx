import type { Metadata } from 'next';
import { Fredoka, Nunito, Mitr } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

/* Thai glyphs: Fredoka/Nunito are Latin-only, so Thai text falls through to Mitr. */
const mitr = Mitr({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mitr',
});

export const metadata: Metadata = {
  title: 'JTrax Admin',
  description: 'JTrax admin portal',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${fredoka.variable} ${nunito.variable} ${mitr.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
