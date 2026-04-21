import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Prompt, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';

export const dynamic = 'force-dynamic';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-prompt',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AssetOps | ระบบจัดการสินทรัพย์ไอที',
  description: 'ระบบศูนย์กลางสำหรับการจัดการสินทรัพย์ไอที ฐานข้อมูล และเครื่องเสมือนอย่างมีประสิทธิภาพ',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${prompt.variable} font-sans antialiased selection:bg-primary/30`}>
        {/* Skip Link for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to main content
        </a>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
