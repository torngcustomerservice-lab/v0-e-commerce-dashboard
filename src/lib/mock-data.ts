import { MasterSku, SalesRecord, AdsRecord, Platform } from "./types"

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

const rand = seededRandom(42)
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const randFloat = (min: number, max: number) => +(rand() * (max - min) + min).toFixed(2)
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

const productNames = [
  "Wireless Earbuds Pro", "Phone Case Ultra", "USB-C Hub 7in1", "Laptop Stand Aluminum",
  "Bluetooth Speaker Mini", "Screen Protector HD", "Fast Charger 65W", "Webcam 1080p",
  "Keyboard Mechanical RGB", "Mouse Wireless Silent", "Ring Light 10inch", "Tripod Flexible",
  "Power Bank 20000mAh", "Cable Organizer Set", "Desk Mat XXL", "Monitor Arm Single",
  "Headphone Stand Wood", "Microphone USB Condenser", "LED Strip 5M RGB", "Smart Plug WiFi",
  "Air Purifier Mini", "Humidifier 500ml", "Desk Lamp LED", "Wireless Charger Pad",
  "Car Mount Magnetic", "Stylus Pen Universal", "Tablet Stand Adjustable", "HDMI Cable 2M",
  "Ethernet Adapter USB", "Portable SSD 500GB"
]

export const masterSkuList: MasterSku[] = productNames.map((name, i) => {
  const cost = randFloat(5, 60)
  const sellingPrice = +(cost * randFloat(1.4, 3.0)).toFixed(2)
  return {
    isku: `iSKU-${String(i + 1).padStart(3, "0")}`,
    productName: name,
    cost,
    sellingPrice,
    margin: +((sellingPrice - cost) / sellingPrice).toFixed(4),
  }
})

const platformStores: Record<Platform, string[]> = {
  Shopee: ["Shopee MY Main", "Shopee MY Official"],
  "Shopee SG": ["Shopee SG Main", "Shopee SG Premium"],
  Lazada: ["Lazada MY Store", "Lazada MY Official", "Lazada PH Store"],
  "TikTok Shop": ["TikTok MY Shop", "TikTok SG Shop", "TikTok PH Shop"],
}

const platforms: Platform[] = ["Shopee", "Shopee SG", "Lazada", "TikTok Shop"]
const allStores = platforms.flatMap((p) => platformStores[p].map((s) => ({ store: s, platform: p })))

const campaignTypes = ["Search Ads", "Discovery Ads", "Video Ads", "Retargeting", "Brand Boost"]

function getDates(days: number): string[] {
  const dates: string[] = []
  const now = new Date("2026-04-06")
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split("T")[0])
  }
  return dates
}

const dates = getDates(30)

export const salesData: SalesRecord[] = []
export const adsData: AdsRecord[] = []

for (const date of dates) {
  for (const { store, platform } of allStores) {
    const skuCount = randInt(5, 15)
    const skus = [...masterSkuList].sort(() => rand() - 0.5).slice(0, skuCount)
    for (const sku of skus) {
      const orders = randInt(1, 30)
      const unitsSold = orders + randInt(0, 5)
      const priceVariation = randFloat(0.85, 1.15)
      const actualPrice = +(sku.sellingPrice * priceVariation).toFixed(2)
      const revenue = +(unitsSold * actualPrice).toFixed(2)
      const discount = +(revenue * randFloat(0, 0.15)).toFixed(2)
      salesData.push({
        date, store, platform, isku: sku.isku, productName: sku.productName,
        orders, unitsSold, revenue, discount, netSales: +(revenue - discount).toFixed(2),
      })

      if (rand() > 0.4) {
        const adsSpend = randFloat(5, 200)
        const adsSales = +(adsSpend * randFloat(0.5, 8)).toFixed(2)
        const ordersAds = randInt(0, Math.ceil(orders * 0.7))
        const unitsSoldAds = ordersAds + randInt(0, 2)
        const impressions = randInt(500, 50000)
        const clicks = randInt(10, Math.ceil(impressions * 0.08))
        adsData.push({
          date, store, platform, isku: sku.isku, productName: sku.productName,
          campaignName: `${pick(campaignTypes)} - ${sku.productName.split(" ")[0]}`,
          adsSpend, adsSales, ordersAds, unitsSoldAds, impressions, clicks,
          ctr: +((clicks / impressions) * 100).toFixed(2),
          cpc: +(adsSpend / clicks).toFixed(2),
          cpm: +((adsSpend / impressions) * 1000).toFixed(2),
          roas: +(adsSales / adsSpend).toFixed(2),
        })
      }
    }
  }
}

export const storeList = allStores
export const platformList = platforms
