import { redirect } from "next/navigation";

// The old "/" overview showed demo/mock analytics (revenue, orders, ROAS)
// with no real data source behind it. It's been removed — land on the
// real working page instead.
export default function DashboardIndex() {
  redirect("/content");
}
