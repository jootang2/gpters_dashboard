import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "송주환 — AX / DX 컨설턴트",
  description: "업무 자동화를 만들고, 그 방법을 가르칩니다. 강의 과정과 자료 모음.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning 은 <body> 한 곳에만 붙인다.
        Bitdefender 등 일부 브라우저 확장이 <body> 에 bis_register / __processed_* 같은
        속성을 주입하는데, 서버 HTML 에는 없는 속성이라 React 가 hydration 불일치를
        경고한다. 확장 동작은 우리가 막을 수 없어 이 경고만 억제한다.
        ⚠️ 진짜 hydration 버그를 숨기려는 용도가 아니다 — 다른 엘리먼트에는 붙이지 마라.
      */}
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-canvas text-fg">
        {children}
      </body>
    </html>
  );
}
