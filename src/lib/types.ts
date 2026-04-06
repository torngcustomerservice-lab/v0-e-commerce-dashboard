export interface SkuMaster {
  id: number;
  sku_code: string;
  product_name: string;
  category: string | null;
  brand: string | null;
  cost: number;
  selling_price: number;
  margin: number;
  created_at: string;
}

export interface SalesRecord {
  id: number;
  date: string;
  store_name: string;
  platform: string;
  sku: string;
  product_name: string;
  orders: number;
  units_sold: number;
  revenue: number;
  discounts: number;
  net_sales: number;
  order_status: string | null;
  order_id: number | null;
  created_at: string;
}

export interface AdsRecord {
  id: number;
  date: string;
  store: string;
  platform: string;
  sku: string;
  campaign_name: string;
  ads_spend: number;
  ads_sales: number;
  orders_ads: number;
  units_sold_ads: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  cpa: number;
  created_at: string;
}
