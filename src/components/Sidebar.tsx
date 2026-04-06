"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ShoppingCart, Megaphone, Package } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/ads", label: "Ads", icon: Megaphone },
  { href: "/sku-master", label: "SKU Master", icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed top-0 left-0 w-[240px] h-screen bg-gray-900 text-white flex flex-col z-50">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">📊 eComDash</h1>
        <p className="text-xs text-gray-400 mt-1">Analytics Hub</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">Powered by Supabase</p>
      </div>
    </aside>
  );
}
