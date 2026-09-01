import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "@/lib/providers"

const lineSeed = localFont({
  src: [
    { path: "../../public/fonts/LINESeedSansTH_W_Th.woff2", weight: "100", style: "normal" },
    { path: "../../public/fonts/LINESeedSansTH_W_Rg.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/LINESeedSansTH_W_Bd.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/LINESeedSansTH_W_He.woff2", weight: "800", style: "normal" },
    { path: "../../public/fonts/LINESeedSansTH_W_XBd.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-line-seed",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SEO Agents - ระบบ SEO อัตโนมัติ",
  description: "ระบบ SEO อัตโนมัติด้วย AI สร้างบทความ วิเคราะห์ SERP ติดตามอันดับ",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`${lineSeed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
