import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hexaframe ERP Portal',
  description: 'Multi-tenant ERP system for institutions and organizations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
