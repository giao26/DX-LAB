import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DX-LAB | Tạo yêu cầu hỗ trợ',
  description: 'Cổng tiếp nhận yêu cầu hỗ trợ DX-LAB',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
