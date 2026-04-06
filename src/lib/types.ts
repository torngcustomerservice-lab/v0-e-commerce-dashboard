export interface MasterSku {
  isku: string
  productName: string
  cost: number
  sellingPrice: number
  margin: number // (sellingPrice - cost) / sellingPrice
}

export interface SalesRecord {
  date: string
  store: string
  platform: string
  isku: string
  productName: string
  orders: number
  unitsSold: number
  revenue: number
  discount: number
  netSales: number // revenue - discount
}

export interface AdsRecord {
  date: string
  store: string
  platform: string
  isku: string
  productName: string
  campaignName: string
  adsSpend: number
  adsSales: number
  ordersAds: number
  unitsSoldAds: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  roas: number // adsSales / adsSpend
}

export type Platform = "Shopee" | "Shopee SG" | "Lazada" | "TikTok Shop"
export type DatePreset = "today" | "yesterday" | "last7d" | "last30d" | "custom"

export interface Filters {
  datePreset: DatePreset
  startDate: string
  endDate: string
  platform: string
  store: string
  search: string
}
