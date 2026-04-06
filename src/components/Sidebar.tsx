"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, Megaphone, Package } from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  { label: "Ads Performance", href: "/ads", icon: Megaphone },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-screen w-[var(--sidebar-width)] bg-white border-r border-gray-200 flex flex-col z-40">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">eCom Dash</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}>
              <item.icon className={cn("w-5 h-5", active ? "text-brand-600" : "text-gray-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100 text-xs text-gray-400">v1.0 • Mock Data</div>
    </aside>
  )
}
