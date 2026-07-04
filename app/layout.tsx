import type { Metadata } from 'next';
import { Patrick_Hand, Mali } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

/* Sketch theme: neat hand-print for headings… */
const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-hand-display',
});

/* …and Mali (a Thai + Latin handwriting face with real bold weights) for body
   text and every Thai glyph. */
const mali = Mali({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hand-thai',
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
      <body className={`${patrickHand.variable} ${mali.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
