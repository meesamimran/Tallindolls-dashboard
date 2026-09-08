// ============================================================
// Agentic Dashboard — Type Definitions
// ============================================================

// --- KPIs ---
export interface KPI {
  title: string;
  value: string;
  trend: number;
  previousValue: string;
  sparkline: number[];
  status: "positive" | "negative" | "neutral";
}

// --- Time Series ---
export interface TimeSeriesEntry {
  date: string;
  revenue: number;
  orders: number;
  marketingSpend: number;
  roas: number;
  sessions: number;
  conversionRate: number;
  [key: string]: string | number;
}

export interface TimeSeriesData {
  timeframe: TimeFrame;
  dataPoints: TimeSeriesEntry[];
  totals: { revenue: number; orders: number; marketingSpend: number; sessions: number };
  averages: { roas: number; conversionRate: number };
}

export type TimeFrame = "7d" | "30d" | "90d" | "12m";

// --- Channel Breakdown ---
export interface ChannelData {
  channel: string;
  revenue: number;
  spend: number;
  roas: number;
  orders: number;
}

// --- Facebook Campaigns ---
export type CampaignStatus = "active" | "paused" | "completed";

export interface FacebookCampaign {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  roas: number;
  status: CampaignStatus;
}

export interface FacebookAdSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalPurchases: number;
  averageCTR: number;
  averageCPC: number;
  blendedROAS: number;
  campaignCount: number;
  activeCount: number;
}

// --- Klaviyo ---
export interface KlaviyoMonthlyData {
  month: string;
  emailRevenue: number;
  campaignRevenue: number;
  flowRevenue: number;
  openRate: number;
  clickRate: number;
  subscribers: number;
  sends: number;
}

// --- Google Analytics ---
export interface LandingPageMetrics {
  page: string;
  sessions: number;
  conversions: number;
}

export interface GAMonthlyData {
  month: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  topLandingPages: LandingPageMetrics[];
}

// --- Inventory ---
export type InventoryCategory = "fast" | "slow" | "normal";
export type ProductStatus = "in_stock" | "low_stock" | "out_of_stock" | "critical";

export interface InventoryItem {
  sku: string;
  productName: string;
  currentStock: number;
  incomingStock: number;
  salesLast30Days: number;
  daysRemaining: number;
  dailySalesVelocity: number;
  category: InventoryCategory;
  status: ProductStatus;
  supplier: string;
  collection: string;
  unitCost: number;
  unitPrice: number;
  reorderPoint: number;
}

// --- Forecast ---
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface ForecastItem {
  sku: string;
  productName: string;
  collection: string;
  currentStock: number;
  incomingStock: number;
  unitsNeeded: number;
  expectedDemand: number;
  recommendedProduction: number;
  safetyStock: number;
  collectionRecommendation: string;
  priorityLevel: PriorityLevel;
  forecastPeriod: number;
  forecastDate: string;
  salesVelocity: number;
}

export interface ProductClassification {
  fastMoving: InventoryItem[];
  slowMoving: InventoryItem[];
  normal: InventoryItem[];
}

// --- Notifications ---
export type NotificationType =
  | "low_inventory" | "high_performance" | "slow_moving"
  | "revenue_milestone" | "reorder" | "campaign_budget"
  | "info" | "warning" | "error" | "success";

export type NotificationSeverity = "critical" | "high" | "medium" | "low" | "success" | "warning" | "info";

export interface Notification {
  id: string;
  title: string;
  description?: string;
  message?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  timestamp: string;
  read: boolean;
  category?: string;
  actionable?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// --- Exchange Rate ---
export interface ExchangeRateHistoryEntry {
  month: string;
  rate: number;
}

export interface ExchangeRateData {
  currentRate: number;
  from: string;
  to: string;
  timestamp: string;
  history: ExchangeRateHistoryEntry[];
}

export interface CurrencyConversion {
  usdAmount: number;
  eurAmount: number;
  exchangeRate: number;
  timestamp: string;
}

// --- Monthly Report ---
export interface MonthlyReport {
  month: string;
  year: number;
  totalRevenue: number;
  totalOrders: number;
  totalMarketingSpend: number;
  averageROAS: number;
  topPerformingChannel: string;
  topPerformingCollection: string;
  revenueGrowth: number;
  orderGrowth: number;
  customerSatisfaction: number;
  inventoryHealth: string;
  topProducts: { name: string; sku: string; revenue: number; quantity: number }[];
  channels: { name: string; revenue: number; percentage: number }[];
  highlights: string[];
}

// --- Agent Types ---
export interface AgentAction {
  id: string;
  agentType: "ad" | "optimizer" | "post" | "inventory";
  title: string;
  description: string;
  status: "completed" | "running" | "pending" | "failed";
  timestamp: string;
  metrics?: { label: string; value: string }[];
}

export interface AgentMetrics {
  totalActions: number;
  adsCreated: number;
  postsScheduled: number;
  budgetSaved: number;
}

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  scheduledDate: string;
  status: "scheduled" | "draft" | "ready" | "approved" | "published";
  productRef?: string;
  /** formatted asset (data URL) so it can be published from the queue */
  imageDataUrl?: string;
  /** which surface it targets */
  surface?: "feed" | "story" | "ad";
  /** server-side scheduled-posts.json task ID for cross-reference with cron status */
  serverTaskId?: string;
  /** server-reported permalink after cron publish */
  permalink?: string;
}

// --- Strategy / Content Insights ---

export interface PostMetrics {
  likes: number;
  comments: number;
  shares?: number;
  reach: number;
  // Note: Meta deprecated the `impressions` metric for IG media (v22+) and
  // FB page posts (v25.0), so this is now 0 for most posts.
  impressions: number;
  saves: number;
  engagement: number;
  // Reels/video views (IG) and post clicks (FB) where available.
  views?: number;
  clicks?: number;
}

export interface PostInsight {
  id: string;
  platform: "instagram" | "facebook";
  caption?: string;
  mediaUrl?: string;
  permalink?: string;
  mediaType?: string;
  timestamp: string;
  metrics: PostMetrics;
}

export interface ContentRecommendation {
  recommendations: string[];
  summary: string;
}
