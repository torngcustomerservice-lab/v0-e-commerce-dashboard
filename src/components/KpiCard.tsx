import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface Props {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  color?: "blue" | "green" | "purple" | "orange" | "red" | "cyan"
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  cyan: "bg-cyan-50 text-cyan-600",
}

export default function KpiCard({ title, value, subtitle, icon: Icon, color = "blue" }: Props) {
  return (
    <div className="card card-body flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
