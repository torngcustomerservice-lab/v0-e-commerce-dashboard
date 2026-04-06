import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/Sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = { title: "eCom Dashboard", description: "E-commerce Analytics Dashboard" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        <main className="ml-[240px] min-h-screen bg-gray-50">{children}</main>
      </body>
    </html>
  )
}
