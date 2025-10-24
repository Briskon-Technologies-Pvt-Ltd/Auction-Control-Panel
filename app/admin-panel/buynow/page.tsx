"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import {
  ShoppingCart,
  Clock,
  Trophy,
  BarChart3,
  ShoppingBag,
  Hourglass,
  BadgeCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ----------------- Helpers ----------------- */
function formatDateShort(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ----------------- Component ----------------- */
export default function BuyNowCombinedDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [bidders, setBidders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [rs, ra, rb] = await Promise.all([
          fetch("/api/sellers").catch(() => null),
          fetch("/api/auctions").catch(() => null),
          fetch("/api/bidders").catch(() => null),
        ]);

        if (rs) {
          const js = await rs.json().catch(() => null);
          setSellers(js?.success ? js.data.profiles || [] : []);
        }
        if (ra) {
          const ja = await ra.json().catch(() => null);
          setAuctions(ja?.success ? ja.data.auctions || [] : []);
        }
        if (rb) {
          const jb = await rb.json().catch(() => null);
          setBidders(jb?.success ? jb.data.profiles || [] : []);
        }
      } catch (err) {
        console.error("fetchAll error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, router]);

  /* ----------------- Derived Data ----------------- */
  const buyNowList = auctions.filter((a) => a.sale_type === 2);
  const approved = buyNowList.filter((a) => a.approved === true);
  const pending = buyNowList.filter((a) => a.approved === false);
  const sold = approved.filter((a) => a.purchaser && String(a.purchaser).trim() !== "").length;
  const active = approved.filter((a) => !a.purchaser || String(a.purchaser).trim() === "").length;
  const total = buyNowList.length;

  // Purchases data
  const purchases = approved.filter((a) => a.purchaser && String(a.purchaser).trim() !== "");

  // GMV & metrics
  const GMV = purchases.reduce((sum, a) => sum + Number(a.buy_now_price || 0), 0);
  const avgValue = purchases.length ? Math.round(GMV / purchases.length) : 0;
  const commission = Math.round(GMV * 0.05);

  // Category performance
  const categoryMap: Record<string, number> = {};
  buyNowList.forEach((a) => {
    const cat = a.categoryid || "Uncategorized";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryPerformance = Object.entries(categoryMap).map(([name, count]) => ({
    name,
    count,
  }));

 // Helper to get ISO week number (1–53)
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNum, year: d.getUTCFullYear() };
}

// --- Listings over time (WEEKLY) ---
const weeklyMap: Record<string, { count: number; date: Date }> = {};

buyNowList.forEach((a) => {
  if (!a.createdat) return;
  const d = new Date(a.createdat);
  if (isNaN(d.getTime())) return;

  const { week, year } = getWeekNumber(d);
  const key = `Week ${week}, ${year}`;

  if (!weeklyMap[key]) {
    // store a representative date (Monday of that week)
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    weeklyMap[key] = { count: 0, date: monday };
  }
  weeklyMap[key].count++;
});

const listingsOverTime = Object.entries(weeklyMap)
  .map(([week, val]) => ({ week, ...val }))
  .sort((a, b) => a.date.getTime() - b.date.getTime());

// --- Purchases over time (WEEKLY) ---
const purchasesWeeklyMap: Record<string, { count: number; date: Date }> = {};

purchases.forEach((a) => {
  if (!a.createdat) return;
  const d = new Date(a.createdat);
  if (isNaN(d.getTime())) return;

  const { week, year } = getWeekNumber(d);
  const key = `Week ${week}, ${year}`;

  if (!purchasesWeeklyMap[key]) {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    purchasesWeeklyMap[key] = { count: 0, date: monday };
  }
  purchasesWeeklyMap[key].count++;
});

const purchasesOverTime = Object.entries(purchasesWeeklyMap)
  .map(([week, val]) => ({ week, ...val }))
  .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Profiles map
  const profilesMap = useMemo(() => {
    const m = new Map<string, any>();
    sellers.forEach((p) => {
      if (p?.id !== undefined && p?.id !== null) m.set(String(p.id), p);
    });
    return m;
  }, [sellers]);

  const biddersMap = useMemo(() => {
    const m = new Map<string, any>();
    bidders.forEach((b) => {
      if (b?.id !== undefined && b?.id !== null) m.set(String(b.id), b);
    });
    return m;
  }, [bidders]);

  const colors = ["#1E3A8A", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

  if (!user || user.role !== "admin") return null;

  /* ----------------- UI ----------------- */
  return (
    <AdminLayout>
     <p className="text-sm font-bold text-gray-500 mb-4"> BUY NOW PRODUCTS</p> 
      <div className="space-y-6">
            <div className="flex gap-3 flex-wrap">
                 <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-blue-100">
                    Total: {total}
                </div>
                <div className="px-3 py-1 rounded-full text-xs  text-blue-800 bg-green-100">
                    Active: {active}
                </div>
                <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-yellow-100">
                    Sold: {sold}
                </div>
                <div className="px-3 py-1 rounded-full text-xs  text-blue-800 bg-red-100">
                    Pending Approval: {pending.length}
                </div>
           
             </div>
            
         {/* Analytics Row - 70% / 30% Split */}
<div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-4">
  {/* LEFT COLUMN — Listings & Purchases Trend */}
  <Card className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
    <CardContent className="p-0">
      <div className="p-4  border-blue-200 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-gray-900"> Listings & purchases trend</h3>
      </div>

      <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
  <LineChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
    {/* Grid */}
    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

    {/* X Axis - now weekly */}
    <XAxis
      dataKey="week" // 👈 changed from "month" to "week"
      tick={{ fontSize: 11, fill: "#6B7280" }}
      allowDuplicatedCategory={false}
      type="category"
      axisLine={{ stroke: "#93C5FD" }}
      tickMargin={8}
      interval={0} // ensures all weeks show (optional)
       
      textAnchor="end"
    />

    {/* Y Axis */}
    <YAxis
      tick={{ fontSize: 11, fill: "#6B7280" }}
      axisLine={{ stroke: "#93C5FD" }}
    />

    {/* Tooltip */}
    <Tooltip
      contentStyle={{
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        fontSize: "12px",
      }}
      formatter={(value, name) => [`${value} ${name === "Listings" ? "listings" : "purchases"}`, name]}
      labelFormatter={(label) => `📅 ${label}`}
    />

    {/* Weekly trend lines */}
    <Line
      type="monotone"
      dataKey="count"
      data={listingsOverTime} // 👈 uses weekly dataset
      stroke="#2563EB"
      strokeWidth={1}
      name="Listings"
      dot={{ r: 2.5 }}
      activeDot={{ r: 4 }}
    />
    <Line
      type="monotone"
      dataKey="count"
      data={purchasesOverTime} // 👈 uses weekly dataset
      stroke="#22C55E"
      strokeWidth={1}
      name="Purchases"
      dot={{ r: 2.5 }}
      activeDot={{ r: 4 }}
    />
  </LineChart>
</ResponsiveContainer>

      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 mb-4 text-xs font-medium text-gray-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-600"></span> Listings
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span> Purchases
        </div>
      </div>
    </CardContent>
  </Card>

  {/* RIGHT COLUMN — KPI Card + Category Pie Chart */}
  <div className="flex flex-col gap-4">
    {/* KPI CARD */}
    <Card className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
      <CardContent className="p-4">
      <h3 className="text-base font-bold text-gray-900 mb-4"> 
        Performance metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 mb-1">Buy Now GMV</p>
            <p className="text-xs font-bold text-gray-600">${GMV.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Average Buy Now Value</p>
            <p className="text-xs font-bold text-gray-600">${avgValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Commission (5%)</p>
            <p className="text-xs font-bold text-gray-600">${commission.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* CATEGORY DISTRIBUTION PIE CHART */}
    <Card className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01] flex-1">
      <CardContent className="p-4">

      <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-full">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-md font-bold text-black">Product category distribution</h4>
            </div>
        <div className="flex flex-col items-center justify-center">
          <div className="h-[200px] w-[200px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryPerformance}
                  dataKey="count"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  activeIndex={activeIndex ?? undefined}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {categoryPerformance.map((_, idx) => (
                    <Cell key={idx} fill={colors[idx % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full">
            {categoryPerformance.map((cat, idx) => (
              <span
                key={idx}
                className={`flex items-center gap-1 ${
                  activeIndex === idx ? "font-semibold scale-105" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                ></span>
                {cat.name}: {cat.count}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

      {/* Approval & Purchases Row - 50% / 50% Split */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* LEFT COLUMN — Pending Approvals */}
  <Card className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Hourglass className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-gray-900">
          Pending Approval ({pending.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 text-left">Supplier/seller</th>
              <th >Product Name</th>
              <th>Currency</th>
              <th>Buy Now price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((a, idx) => {
              const p = profilesMap.get(String(a.seller));
              const sellerName = p ? `${p.fname || ""} ${p.lname || ""}` : "-";
              return (
                <tr key={a.id ?? idx} className="border-b hover:bg-blue-50">
                        <td className="p-2 text-left">
                         <HoverProfileCard id={p.id}>
                         <span className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition">
                         {sellerName}
                                                 </span>
                                                 </HoverProfileCard>
                                             </td>
                  <td className="p-2"> {a.productname} </td>
                   <td className="p-2 text-center">{a.currency}</td>
                  <td className="p-2 text-center">{a.buy_now_price}</td>
                  <td className="p-2 text-center">
                                          <Button
                                            size="sm"
                                            className="bg-green-100 text-green-700 text-xs mr-1"
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-red-100 text-red-700 text-xs"
                                          >
                                            Reject
                                          </Button>
                                        </td>
                </tr>
              );
            })}
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No pending Buy Now products
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>

  {/* RIGHT COLUMN — All Purchases */}
  <Card className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
    <CardContent className="p-4">
      <h3 className="font-semibold text-gray-600 flex  gap-2 border-blue-200 pb-2">
        <ShoppingBag className="w-5 h-5 text-blue-600" /> Recent purchases
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th>Category</th>
              <th>Seller</th>
              <th>Purchaser</th>
              <th>Currency</th>
              <th>Price</th>
              <th>Purchase Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((a, idx) => {
              const seller = profilesMap.get(String(a.seller));
              const buyer = biddersMap.get(String(a.purchaser));
              const sellerName = seller ? `${seller.fname || ""} ${seller.lname || ""}` : "-";
              const buyerName = buyer ? `${buyer.fname || ""} ${buyer.lname || ""}` : "-";
              return (
                <tr key={a.id ?? idx} className="border-b hover:bg-blue-50">
                  <td className="p-2">{a.productname}</td>
                  <td className="p-2 text-center">{a.categoryid || "-"}</td>
                  
                  <td className="p-2 text-left">
                         <HoverProfileCard id={seller.id}>
                         <span className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition">
                          {sellerName}
                        </span>
                         </HoverProfileCard>
                  </td>
  
                  <td className="p-2 text-left">
                         <HoverProfileCard id={buyer.id}>
                         <span className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition">
                          {buyerName}
                        </span>
                         </HoverProfileCard>
                  </td>
                  <td className="p-2 text-center">{a.currency}</td>
                  <td className="p-2 text-center">{a.buy_now_price}</td>
                  <td className="p-2 text-center">{formatDateShort(a.createdat)}</td>
                </tr>
              );
            })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No purchases yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</div>

      
      
      
      </div>
    </AdminLayout>
  );
}
