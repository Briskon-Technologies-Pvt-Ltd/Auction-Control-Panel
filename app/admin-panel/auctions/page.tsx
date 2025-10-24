"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Listbox } from "@headlessui/react";
import Link from "next/link";
import {
  Gavel,
  Clock,
  Trophy,
  ChevronsUpDown,
  PieChart as PieIcon,
  BarChart3,
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
    Legend,
    BarChart,
    Bar,
    LabelList
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

function calcEndDate(
  start?: string | null,
  duration?: { days?: number; hours?: number; minutes?: number }
) {
  if (!start) return null;
  const s = new Date(start);
  if (isNaN(s.getTime())) return null;
  const end = new Date(s);
  if (duration) {
    if (duration.days) end.setDate(end.getDate() + (Number(duration.days) || 0));
    if (duration.hours) end.setHours(end.getHours() + (Number(duration.hours) || 0));
    if (duration.minutes) end.setMinutes(end.getMinutes() + (Number(duration.minutes) || 0));
  }
  return end;
}

/* ----------------- Component ----------------- */
export default function AuctionsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [bidders, setBidders] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<"all" | "forward" | "reverse">("all");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [rb, rs, ra] = await Promise.all([
          fetch("/api/bidders").catch(() => null),
          fetch("/api/sellers").catch(() => null),
          fetch("/api/auctions").catch(() => null),
        ]);

        if (rb) {
          const jb = await rb.json().catch(() => null);
          setBidders(jb?.success ? jb.data.profiles || [] : []);
        } else setBidders([]);

        if (rs) {
          const js = await rs.json().catch(() => null);
          setSellers(js?.success ? js.data.profiles || [] : []);
        } else setSellers([]);

        if (ra) {
          const ja = await ra.json().catch(() => null);
          setAuctions(ja?.success ? ja.data.auctions || [] : []);
        } else setAuctions([]);
      } catch (err) {
        console.error("fetchAll error", err);
        setBidders([]);
        setSellers([]);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, router]);

 
/* ----------------- Derived data ----------------- */
const now = new Date();
const auctionList = auctions.filter((a) => a.sale_type === 1 || a.sale_type === 3);
const buyNowList = auctions.filter((a) => a.sale_type === 2);

// Defensive approved/pending checks (accepts boolean true or "true")
const isApproved = (a: any) =>
  a && (a.approved === true || String(a.approved).toLowerCase() === "true");

const approved = auctionList.filter((a) => isApproved(a));
const pending = auctionList.filter((a) => !isApproved(a));

// Live / Upcoming / Closed
const live = approved.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return start && end ? start <= now && end >= now : false;
}).length;

const upcoming = approved.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  return start ? start > now : false;
}).length;

const closed = approved.filter((a) => {
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return end ? end < now : false;
}).length;

// Forward / Reverse approved
const forwardList = approved.filter(
  (a) => String(a.auctiontype || "").toLowerCase() === "forward"
);
const reverseList = approved.filter(
  (a) => String(a.auctiontype || "").toLowerCase() === "reverse"
);

// pending counts (non-approved in auctionList)
const forwardPending = auctionList.filter(
  (a) => String(a.auctiontype || "").toLowerCase() === "forward" && !isApproved(a)
).length;
const reversePending = auctionList.filter(
  (a) => String(a.auctiontype || "").toLowerCase() === "reverse" && !isApproved(a)
).length;

// subtype breakdowns (for approved forward/reverse lists)
const forwardEnglish = approved.filter((a) => {
    const subtype = String(a.auctionsubtype || "").toLowerCase();
    return subtype === "standard" || subtype === "english";
  }).length;
  
const forwardSilent = forwardList.filter(
  (a) => String(a.auctionsubtype || "").toLowerCase() === "silent"
).length;
const forwardSealed = forwardList.filter(
  (a) => String(a.auctionsubtype || "").toLowerCase() === "sealed"
).length;
const forwardUnspecified = forwardList.filter(
  (a) =>
    !a.auctionsubtype ||
    !["standard", "english","silent", "sealed"].includes(String(a.auctionsubtype || "").toLowerCase())
).length;

const reverseStandard = reverseList.filter(
  (a) => String(a.auctionsubtype || "").toLowerCase() === "standard"
).length;
const reverseRanked = reverseList.filter(
  (a) => String(a.auctionsubtype || "").toLowerCase() === "ranked"
).length;
const reverseSealed = reverseList.filter(
  (a) => String(a.auctionsubtype || "").toLowerCase() === "sealed"
).length;
const reverseUnspecified = reverseList.filter(
  (a) =>
    !a.auctionsubtype ||
    !["standard", "ranked", "sealed"].includes(String(a.auctionsubtype || "").toLowerCase())
).length;

/// Outcomes (Success vs Unsold)
const successful = approved.filter(a => {
    const end = calcEndDate(a.scheduledstart, a.auctionduration);
    const isClosed = end ? end < now : false;
    return isClosed && a.currentbid && Number(a.currentbid) > 0;
  }).length;
  
  const unsold = closed - successful < 0 ? 0 : closed - successful;
  

// ---------------- Financial snapshot ----------------
// ---------------- Auction GMV (with currency breakdown) ----------------
const auctionCurrencyMap: Record<string, number> = {};
approved.forEach((a) => {
  const bid = a?.currentbid;
  const curr = a?.currency || "USD";
  if (bid !== null && bid !== undefined && bid !== "" && !isNaN(Number(bid))) {
    auctionCurrencyMap[curr] = (auctionCurrencyMap[curr] || 0) + Number(bid);
  }
});
const auctionGMV = Object.values(auctionCurrencyMap).reduce((s, v) => s + v, 0);

// ---------------- Buy Now GMV (with currency breakdown) ----------------
const buyNowSoldList = buyNowList.filter((b) => b && b.purchaser);
const buyNowCurrencyMap: Record<string, number> = {};
buyNowSoldList.forEach((b) => {
  const price = b?.buy_now_price;
  const curr = b?.currency || "USD";
  if (price !== null && price !== undefined && price !== "" && !isNaN(Number(price))) {
    buyNowCurrencyMap[curr] = (buyNowCurrencyMap[curr] || 0) + Number(price);
  }
});

const buyNowGMV = Object.values(buyNowCurrencyMap).reduce((s, v) => s + v, 0);

// Averages: auction avg uses approved auctions; buy-now avg uses sold buy-now items
const avgAuctionValue = approved.length ? Math.round(auctionGMV / approved.length) : 0;
const avgBuyNowValue = buyNowSoldList.length ? Math.round(buyNowGMV / buyNowSoldList.length) : 0;

// Commission (5%) — split by channel and total
const auctionCommission = Math.round(auctionGMV * 0.05);
const buyNowCommission = Math.round(buyNowGMV * 0.05);
const totalCommission = auctionCommission + buyNowCommission;

// Category performance
const categoryMap: Record<string, number> = {};
auctionList.forEach((a) => {
  const cat = a.categoryid || "Uncategorized";
  categoryMap[cat] = (categoryMap[cat] || 0) + 1;
});
const categoryPerformance = Object.entries(categoryMap).map(([name, count]) => ({ name, count }));

// Status summary strip
const statusSummary = [
  { name: "Live", value: live, color: "#16A34A" },
  { name: "Upcoming", value: upcoming, color: "#2563EB" },
  { name: "Closed", value: closed, color: "#6B7280" },
  { name: "Pending", value: pending.length, color: "#F59E0B" },
];

// Auctions Over Time (monthly aggregation, sorted oldest -> newest)
const monthlyMap: Record<string, { Forward: number; Reverse: number; date: Date }> = {};
auctionList.forEach((a) => {
  if (!a.scheduledstart) return;
  const d = new Date(a.scheduledstart);
  if (isNaN(d.getTime())) return;
  const key = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
  if (!monthlyMap[key]) {
    monthlyMap[key] = { Forward: 0, Reverse: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
  }
  if (String(a.auctiontype || "").toLowerCase() === "forward") monthlyMap[key].Forward++;
  if (String(a.auctiontype || "").toLowerCase() === "reverse") monthlyMap[key].Reverse++;
});
const auctionsOverTime = Object.entries(monthlyMap).map(([month, val]) => ({ month, ...val })).sort((a, b) => a.date.getTime() - b.date.getTime());

// profiles map for createdBy / seller lookup (useMemo to avoid recompute)
const profilesMap = useMemo(() => {
  const m = new Map<string, any>();
  for (const p of [...sellers, ...bidders]) {
    if (p?.id !== undefined && p?.id !== null) m.set(String(p.id), p);
  }
  return m;
}, [sellers, bidders]);

// Pending filter applied (for approval table)
const filteredPending = pending.filter((a) => {
  if (filter === "all") return true;
  return String(a.auctiontype || "").toLowerCase() === filter;
});

// dynamic approval title
const approvalTitle =
  filter === "forward"
    ? `Approval Requests : New Forward Auctions (${filteredPending.length})`
    : filter === "reverse"
    ? `Approval Requests : New Reverse Auctions (${filteredPending.length})`
    : `Approval Requests : New Auctions (${filteredPending.length})`;

    {/* small helper for currency symbol (extend as needed) */}
const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    INR: "₹",
    CAD: "CA$",
    GBP: "£",
    AUD: "A$",
  };
  const [topWinners, setTopWinners] = useState<any[]>([]);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const res = await fetch("/api/all-winners");
        const data = await res.json();
  
        if (data.success && data.winners) {
          // Sort by closed_on (descending)
          const sorted = [...data.winners].sort(
            (a, b) => new Date(b.closed_on).getTime() - new Date(a.closed_on).getTime()
          );
          setTopWinners(sorted.slice(0, 5));
        } else {
          setTopWinners([]);
        }
      } catch (err) {
        console.error("Failed to fetch winners:", err);
        setTopWinners([]);
      }
    };
  
    fetchWinners();
  }, []);
  

  if (!user || user.role !== "admin") return null;
  /* ----------------- UI ----------------- */

  return (
    
<AdminLayout>
  <p className="text-sm font-bold text-gray-500 mb-4">AUCTIONS</p> 
   <div className="space-y-4 ">
        {/* Status Summary */}
        <div className="flex gap-4 flex-wrap">
            {statusSummary.map((s) => (
           <div
                key={s.name}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: s.color + "30",
                  color: s.color,
              
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: s.color,
                  
                  }}
                ></span>
                {s.name}: {s.value}
              </div>
            ))}
          
        </div>
        {/* Charts Row: Line Chart + Pie Charts  */}
         <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          
            {/* LEFT COLUMN (line chart) */}
            <div className="md:col-span-7">
                <Card className="h-[300px] border border-blue-200">
                   <CardContent className="p-3 flex flex-col h-full">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-[14px]">
                        <Clock className="w-4 h-4 text-blue-600" /> Auction listings over time
                      </h3>
                       <div className="w-full bg-black/20 mt-1 mb-2 h-[1px]" />
                         <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={auctionsOverTime}>
              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="1 3"
                horizontal
                vertical
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#374151" }}
                axisLine={{ stroke: "#9CA3AF" }}
                tickLine={{ stroke: "#9CA3AF" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#374151" }}
                axisLine={{ stroke: "#9CA3AF" }}
                tickLine={{ stroke: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "10px",
                  backgroundColor: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                }}
                labelStyle={{ fontSize: "10px", color: "#374151" }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
              <Line
                type="monotone"
                dataKey="Forward"
                stroke="#16A34A"
                strokeWidth={1.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Reverse"
                stroke="#DC2626"
                strokeWidth={1.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
                               </ResponsiveContainer>
                          </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN (pies) */}
            <div className="md:col-span-3 flex flex-col justify-between h-[300px] space-y-2">
                  {/* Forward Auctions Pie */}
                  <Link
                href="/admin-panel/auctions/forward"
                className="group block transition-all duration-500 ease-in-out"
              >
                <Card
                  className="h-[150px] border border-blue-200 bg-white 
                  rounded-xl transition-all duration-500 ease-in-out 
                  hover:from-white hover:to-blue-50 hover:bg-gradient-to-br 
                  hover:shadow-lg hover:shadow-blue-100 hover:scale-[1.02]"
                >
                  <CardContent className="p-3 transition-all duration-500 ease-in-out flex items-center justify-between gap-3">
                    
                    {/* LEFT SECTION - Title + Legend */}
                    <div className="flex flex-col justify-center flex-1">
                      <h3
                        className="font-semibold text-gray-800 flex items-center gap-2 text-xs transition-colors
                        duration-500 ease-in-out group-hover:text-blue-700 mb-2"
                      >
                        <Gavel
                          className="w-4 h-4 text-green-600 transition-transform duration-500 ease-in-out
                          group-hover:scale-110 group-hover:text-blue-600"
                        />
                        Forward Auctions ({forwardList.length + forwardPending})
                      </h3>

                      {/* Legend - stacked vertically */}
                      <div
                        className="flex flex-col gap-1 text-[10px] text-gray-600
                        transition-colors duration-500 ease-in-out group-hover:text-blue-700"
                      >
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-700 rounded-full"></span>English: {forwardEnglish}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>Silent: {forwardSilent}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-300 rounded-full"></span>Sealed: {forwardSealed}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>Pending: {forwardPending}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SECTION - Pie Chart */}
                    <div className="flex-1 flex justify-center items-center">
                      <div
                        className="h-[110px] w-[110px] transition-transform duration-500 ease-in-out 
                        group-hover:scale-[1.05]"
                      >
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "English", value: forwardEnglish },
                                { name: "Silent", value: forwardSilent },
                                { name: "Sealed", value: forwardSealed },
                                { name: "Unspecified", value: forwardUnspecified },
                                { name: "Pending", value: forwardPending },
                              ]}
                              dataKey="value"
                              outerRadius={50}
                            >
                              <Cell fill="#16A34A" />
                              <Cell fill="#22C55E" />
                              <Cell fill="#86EFAC" />
                              <Cell fill="#A7F3D0" />
                              <Cell fill="#F59E0B" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

                  {/* Reverse Auctions Pie */}
                  <Link
                href="/admin-panel/auctions/reverse"
                className="group block transition-all duration-500 ease-in-out"
              >
                <Card
                  className="h-[150px] border border-blue-200 bg-white 
                  rounded-xl transition-all duration-500 ease-in-out 
                  hover:from-white hover:to-red-50 hover:bg-gradient-to-br 
                  hover:shadow-lg hover:shadow-red-100 hover:scale-[1.02]"
                >
                  <CardContent className="p-3 transition-all duration-500 ease-in-out flex items-center justify-between gap-3">
                    
                    {/* LEFT SECTION - Title + Legend */}
                    <div className="flex flex-col justify-center flex-1">
                      <h3
                        className="font-semibold text-gray-800 flex items-center gap-2 text-xs transition-colors
                        duration-500 ease-in-out group-hover:text-red-700 mb-2"
                      >
                        <Gavel
                          className="w-4 h-4 text-red-600 transition-transform duration-500 ease-in-out
                          group-hover:scale-110 group-hover:text-red-700"
                        />
                        Reverse Auctions ({reverseList.length + reversePending})
                      </h3>

                      {/* Legend - stacked vertically */}
                      <div
                        className="flex flex-col gap-1 text-[10px] text-gray-600
                        transition-colors duration-500 ease-in-out group-hover:text-red-700"
                      >
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-600 rounded-full"></span>Standard: {reverseStandard}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>Ranked: {reverseRanked}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-300 rounded-full"></span>Sealed: {reverseSealed}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>Pending: {reversePending}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SECTION - Pie Chart */}
                    <div className="flex-1 flex justify-center items-center">
                      <div
                        className="h-[110px] w-[110px] transition-transform duration-500 ease-in-out 
                        group-hover:scale-[1.05]"
                      >
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Standard", value: reverseStandard },
                                { name: "Ranked", value: reverseRanked },
                                { name: "Sealed", value: reverseSealed },
                                { name: "Unspecified", value: reverseUnspecified },
                                { name: "Pending", value: reversePending },
                              ]}
                              dataKey="value"
                              outerRadius={50}
                            >
                              <Cell fill="#DC2626" />
                              <Cell fill="#F87171" />
                              <Cell fill="#FCA5A5" />
                              <Cell fill="#FECACA" />
                              <Cell fill="#F59E0B" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

            </div>
          </div>
        
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card className="border border-blue-100 hover:shadow-md rounded-xl h-[220px]">
    <CardContent className="p-4">
    <h3 className="font-semibold flex items-center gap-2 text-gray-800"> <PieIcon className="w-4 h-4 text-purple-600" /> Auction Outcomes </h3>
        <ResponsiveContainer width="100%" height={180}>
        <PieChart margin={{ top: 10, bottom: 10 }}>
            <Pie
              data={[
                { name: "Successful", value: successful },
                { name: "Unsold", value: unsold },
              ]}
              dataKey="value"
              innerRadius={35}  // Inner radius creates the “hole”
              outerRadius={50} // Outer ring radius
            
            >
              <Cell fill="#60A5FA" />
              <Cell fill="#FCA5A5" />
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: "10px",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
    </CardContent>

  </Card>
  {/* --- 2️⃣ Auction GMV --- */}
  <Card className="transition-all duration-300 border border-gray-100 hover:shadow-md hover:border-green-300 rounded-xl bg-white">
    <CardContent className="p-4">
      <p className="text-[13px] font-semibold text-gray-700 mb-1 text-center">
        Auction GMV
      </p>
      <div className="flex justify-center items-baseline mb-2">
        <span className="text-xl font-extrabold text-green-600">
          {currencySymbols["USD"]}
          {Number(auctionGMV || 0).toLocaleString()}
        </span>
      </div>
      <div className="h-px bg-gray-100 mb-2" />
      {(Object.entries(auctionCurrencyMap || {})).length === 0 ? (
        <p className="text-[11px] text-gray-400 text-center">
          No currency breakdown
        </p>
      ) : (
        <div className="text-[11px] text-gray-600 space-y-1">
          {Object.entries(auctionCurrencyMap).map(([curr, val]) => (
            <div key={curr} className="flex justify-between px-2">
              <span className="text-gray-500">
                {currencySymbols[curr] ?? curr}
                <span className="ml-1">{curr}</span>
              </span>
              <span className="font-medium text-gray-800">
                {Number(val).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
  {/* --- 3️⃣ Buy Now GMV --- */}
  <Card className="transition-all duration-300 border border-gray-100 hover:shadow-md hover:border-blue-300 rounded-xl bg-white">
    <CardContent className="p-4">
      <p className="text-[13px] font-semibold text-gray-700 mb-1 text-center">
        Buy Now GMV
      </p>
      <div className="flex justify-center items-baseline mb-2">
        <span className="text-xl font-extrabold text-blue-600">
          {currencySymbols["USD"]}
          {Number(buyNowGMV || 0).toLocaleString()}
        </span>
      </div>
      <div className="h-px bg-gray-100 mb-2" />
      {(Object.entries(buyNowCurrencyMap || {})).length === 0 ? (
        <p className="text-[11px] text-gray-400 text-center">
          No currency breakdown
        </p>
      ) : (
        <div className="text-[11px] text-gray-600 space-y-1">
          {Object.entries(buyNowCurrencyMap).map(([curr, val]) => (
            <div key={curr} className="flex justify-between px-2">
              <span className="text-gray-500">
                {currencySymbols[curr] ?? curr}
                <span className="ml-1">{curr}</span>
              </span>
              <span className="font-medium text-gray-800">
                {Number(val).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
  {/* --- 4️⃣ Combined Averages + Commission --- */}
  <Card className="transition-all duration-300 border border-gray-100 hover:shadow-md hover:border-indigo-300 rounded-xl bg-white">
    <CardContent className="p-4">
      <p className="text-[13px] font-semibold text-gray-700 mb-2 text-center">
        Summary Metrics
      </p>

      <div className="grid grid-cols-3 gap-3 text-center">
        {/* Avg Auction Value */}
        <div className="flex flex-col">
          <p className="text-[11px] text-gray-500 mb-1">
            Avg Auction
          </p>
          <span className="text-sm font-bold text-indigo-600">
            {currencySymbols["USD"]}
            {Number(avgAuctionValue || 0).toLocaleString()}
          </span>
        </div>

        {/* Avg Buy Now Value */}
        <div className="flex flex-col border-l border-gray-100 border-r">
          <p className="text-[11px] text-gray-500 mb-1">
            Avg Buy Now
          </p>
          <span className="text-sm font-bold text-purple-600">
            {currencySymbols["USD"]}
            {Number(avgBuyNowValue || 0).toLocaleString()}
          </span>
        </div>

        {/* Commission */}
        <div className="flex flex-col">
          <p className="text-[11px] text-gray-500 mb-1">
            Commission (5%)
          </p>
          <span className="text-sm font-bold text-orange-600">
            {currencySymbols["USD"]}
            {Number(totalCommission || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Breakdown line */}
      <div className="h-px bg-gray-100 my-3" />

      {/* Commission breakdown */}
      <div className="flex justify-center gap-2 text-[11px] text-gray-500 font-medium">
        <span>
          Auction:{" "}
          <span className="text-gray-700 font-semibold">
            {currencySymbols["USD"]}
            {Number(auctionCommission || 0).toLocaleString()}
          </span>
        </span>
        <span className="text-gray-400">|</span>
        <span>
          Buy Now:{" "}
          <span className="text-gray-700 font-semibold">
            {currencySymbols["USD"]}
            {Number(buyNowCommission || 0).toLocaleString()}
          </span>
        </span>
      </div>
    </CardContent>
  </Card>
</div>

    {/* Winners + Category */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
  {/* --- Auction Winners (30%) --- */}
  <div className="md:col-span-3">
    
  <Card className="h-[400px] border border-blue-200">
  <CardContent className="p-4 flex flex-col h-full">
    {/* Header */}
    <div className="flex items-center gap-2 mb-4">
      <Trophy className="w-5 h-5 text-yellow-500" />
      <h3 className="font-semibold text-gray-800">Top 5 Winners (Recent Closures)</h3>
    </div>

    {/* Table container */}
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-blue-50">
          <tr>
            <th className="text-left p-2">Auction</th>
            <th className="text-left p-2">Winner</th>
            <th className="text-right p-2">Winning Bid</th>
          </tr>
        </thead>
        <tbody>
          {topWinners.length > 0 ? (
            topWinners.slice(0, 5).map((w, idx) => (
              <tr
                key={idx}
                className="border-b last:border-0 hover:bg-blue-50 transition-colors"
              >
                <td className="p-2 text-gray-800 font-medium">
                  {w.auction_name  || "-"}
                </td>
                <td className="p-2 text-gray-700">
                <HoverProfileCard id={w.winner_id} >
  <span className="text-blue-600 underline cursor-pointer"> {w.winner_name}
  </span>
</HoverProfileCard>

                </td>
                <td className="p-2 text-right font-semibold text-blue-600">
                  {w.currency} {Number(w.winning_bid).toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="p-4 text-center text-gray-500">
                No recent winners found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Footer link */}
    <div className="flex justify-end mt-3">
      <a
        href="/admin-panel/winners"
        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition"
      >
        All winners →
      </a>
    </div>
  </CardContent>
</Card>

  </div>
  {/* --- Category Performance (70%) --- */}
  <div className="md:col-span-7">
    <Card className="h-[400px] border border-blue-200">
      <CardContent className="p-4">
        {/* Heading (no underline line now) */}
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" /> Category wise auctions spread
        </h3>
        {/* Reversed horizontal bar chart */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={categoryPerformance}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
            barCategoryGap={8}
            barGap={4}
          >
            <defs>
              {categoryPerformance.map((entry, i) => (
                <linearGradient
                  key={i}
                  id={`gradient-${i}`}
                  x1="1"  // reversed direction (start from right)
                  y1="0"
                  x2="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              ))}
            </defs>
            {/* Dotted grid */}
            <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" />
            {/* Reverse X-axis (values grow from right to left) */}
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={{ stroke: "#93C5FD" }}
              reversed={true} // ✅ Reverse axis direction
            />
            {/* ✅ Y-axis on right with right-aligned labels */}
            <YAxis
              dataKey="name"
              type="category"
              orientation="right"
              width={100}
              tick={{ fontSize: 11, fill: "#374151", textAnchor: "start" }}
              axisLine={{ stroke: "#93C5FD" }}
              tickLine={{ stroke: "#93C5FD" }}
            />

            <Tooltip
              contentStyle={{
                fontSize: "11px",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
              }}
            />

            {/* ✅ Gradient bars now flow right-to-left */}
            <Bar dataKey="count" fill="url(#gradient-0)" radius={[4, 0, 0, 4]}>
              <LabelList
                dataKey="count"
                position="insideLeft" // ✅ Label inside left side since reversed
                fontSize={11}
                fill="#111827"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
</div>


        {/* Approval Requests */}
        <Card className="border border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-800">{approvalTitle}</h3>
              </div>
              <div className="w-40">
                <Listbox value={filter} onChange={setFilter}>
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left shadow-sm text-sm">
                      <span className="block truncate capitalize">{filter}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronsUpDown className="h-4 w-4 text-gray-400" /></span>
                    </Listbox.Button>
                    <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm z-50 ring-1 ring-black/5 overflow-auto">
                      <Listbox.Option value="all" className="px-3 py-2 hover:bg-blue-50 cursor-pointer">All</Listbox.Option>
                      <Listbox.Option value="forward" className="px-3 py-2 hover:bg-green-50 cursor-pointer">Forward</Listbox.Option>
                      <Listbox.Option value="reverse" className="px-3 py-2 hover:bg-red-50 cursor-pointer">Reverse</Listbox.Option>
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="p-2 text-left">Created by</th>
                    <th>Auction Name </th>
                    <th>Auction Type</th>
                    <th>Auction Format</th>
                    <th>Start Date,Time</th>
                    <th>End Date,Time</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((a, idx) => {
                    let creatorName = "-";
                    if (a?.seller) {
                      const p = profilesMap.get(String(a.seller));
                      if (p) creatorName = `${p.fname || ""} ${p.lname || ""}`.trim();
                    }
                    if (creatorName === "-" && a?.createdby) {
                      const p2 = profilesMap.get(String(a.createdby));
                      if (p2) creatorName = `${p2.fname || ""} ${p2.lname || ""}`.trim();
                      else creatorName = String(a.createdby);
                    }
                    const start = a.scheduledstart ? formatDateShort(a.scheduledstart) : "-";
                    const endDate = calcEndDate(a.scheduledstart, a.auctionduration);
                    const end = endDate ? formatDateShort(endDate.toISOString()) : "-";
                    const typeLower = String(a.auctiontype || "").toLowerCase();
                    const typePillClass = typeLower === "forward"
                      ? "px-2 py-0.5 rounded-full text-xs  bg-green-100 text-green-700"
                      : typeLower === "reverse"
                      ? "px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"
                      : "px-2 py-0.5 rounded-full text-xs  bg-gray-100 text-gray-700";
                    return (
                      <tr key={a.id ?? idx} className="border-b hover:bg-gray-50">
                      {/* ✅ Wrap first <td> with HoverBoardCard */}
                      <td className="p-2">
                      <HoverProfileCard id={
  a.seller 
    ? String(a.seller) 
    : a.createdby 
      ? String(a.createdby)
      : null
}>
  <span className="text-blue-600 underline cursor-pointer">
    {creatorName}
  </span>
</HoverProfileCard>
                      </td>
                    
                      <td className="p-2">{a.productname || "-"}</td>
                    
                      <td className="p-2">
                        <span className={typePillClass}>{a.auctiontype || "-"}</span>
                      </td>
                    
                      <td className="p-2 text-center">{a.auctionsubtype || "-"}</td>
                    
                      <td className="p-2 text-center">{start}</td>
                      <td className="p-2 text-center">{end}</td>
                    
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          className="bg-green-100 text-green-700 text-xs mr-1 hover:bg-green-200"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-100 text-red-700 text-xs hover:bg-red-200"
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                    
                    );
                  })}
                  {filteredPending.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-500">No auctions pending approval</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

    </div>
</AdminLayout>
  );
}
