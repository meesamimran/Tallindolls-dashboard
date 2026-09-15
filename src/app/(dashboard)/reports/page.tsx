import { FileText } from "lucide-react";

// Reports previously rendered mock numbers from dashboardService (a demo
// data service with no real store/analytics source). Replaced with an honest
// empty state until a real data source is connected.
export default function ReportsPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)] text-center py-20 px-6">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[2px] bg-[var(--brand-softer)]">
          <FileText className="size-6 text-[var(--brand)]" />
        </div>
        <h1 className="text-[24px] font-semibold text-[var(--heading)]">
          Reports
        </h1>
        <p className="mt-2 max-w-md mx-auto text-[14px] text-[var(--body)]">
          No analytics data connected yet. Connect your store or ad accounts
          to see real performance reports here.
        </p>
      </div>
    </div>
  );
}
