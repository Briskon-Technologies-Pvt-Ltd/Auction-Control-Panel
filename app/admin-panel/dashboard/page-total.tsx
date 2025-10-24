"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Listbox } from "@headlessui/react";

import {
  Users,
  Building,
  Gavel,
  ShoppingCart,
  Trophy,
  FileText,
  ChevronsUpDown,
  Activity,
  Radar,
} from "lucide-react";
import { PieChart,AreaChart,Area ,Pie, ComposedChart,Cell,LineChart,LineProps,Line, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import HoverProfileCard from "@/components/profile/HoverProfileCard";

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

function calcEndDate(start?: string | null, duration?: { days?: number; hours?: number; minutes?: number }) {
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
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bidders, setBidders] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidStats, setBidStats] = useState<any[]>([]);
  const [totalBidRate, setTotalBidRate] = useState(0);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<"bidders" | "suppliers" | "auctions" | "buynow">(
    "bidders"
  )
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [gmvTrend, setGmvTrend] = useState<any[]>([]);
  const [revenueRisk, setRevenueRisk] = useState<any>({
    gmv: 0,
    takeRate: 0,
    atRiskCount: 0,
  });
;

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

  useEffect(() => {
    if (auctions.length === 0) return;
  
    const fetchBids = async () => {
      try {
        const res = await fetch("/api/bids?limit=5000");
        const json = await res.json();
        if (!json.success) return;
  
        /* ----------------- GROUP BIDS ----------------- */
        const grouped: Record<string, any> = {};
        for (const b of json.data.bids) {
          if (!grouped[b.auction_id]) {
            grouped[b.auction_id] = { count: 0, auctionId: b.auction_id, bids: [] };
          }
          grouped[b.auction_id].count++;
          grouped[b.auction_id].bids.push(b);
        }
  
        /* ----------------- BUILD AUCTION STATS ----------------- */
        const stats = Object.values(grouped).map((g: any) => {
          const auction = auctions.find((a) => a.id === g.auctionId);
          const endDate = auction
            ? calcEndDate(auction.scheduledstart, auction.auctionduration)
            : null;
  
          const bestBid = Math.max(...g.bids.map((bb: any) => bb.amount), 0);
          const reserve = auction?.reserveMetPct || Math.floor(Math.random() * 100);
  
          return {
            auction: auction?.productname || "Auction",
            bestBid,
            bidVelocity: g.count > 80 ? "High" : g.count > 40 ? "Medium" : "Low",
            reserve: `${reserve}% met`,
            status:
              reserve > 70
                ? "Healthy"
                : reserve > 40
                ? "At risk"
                : "Needs attention",
            bids: g.count,
            endDate,
            auctionId: g.auctionId,
          };
        });
  
        const sorted = stats.sort((a: any, b: any) => {
          const endA = new Date(a.endDate || 0).getTime();
          const endB = new Date(b.endDate || 0).getTime();
          return endA - endB;
        });
  
        setBidStats(sorted.slice(0, 10));
        setTotalBidRate(json.data.bids.length);
  
        /* ===================== REVENUE & RISK ===================== */
  
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - 30); // last 60 days window
  
        // --- Actual (Closed) auctions ---
        const closed = auctions.filter((a) => {
          const end = calcEndDate(a.scheduledstart, a.auctionduration);
          return end && end < now && end >= cutoffDate;
        });
  
        // --- Projected (Active) auctions ---
        const active = auctions.filter((a) => {
          const start = new Date(a.scheduledstart);
          const end = calcEndDate(a.scheduledstart, a.auctionduration);
          return start <= now && end >= now;
        });
  
        // --- Total GMV (actual only) ---
        const gmv = closed.reduce((sum, a) => {
          const auctionStats = stats.find((s: any) => s.auctionId === a.id);
          return sum + (auctionStats?.bestBid || 0);
        }, 0);
  
        // --- Take Rate ---
        const platformFeePct = 0.05;
        const takeRate = gmv > 0 ? ((gmv * platformFeePct) / gmv) * 100 : 0;
  
        // --- At-risk Auctions Count ---
        const atRiskCount = stats.filter((s: any) => s.status !== "Healthy").length;
  
        setRevenueRisk({ gmv, takeRate, atRiskCount });
  
        /* ----------------- GMV TREND (ACTUAL + PROJECTED) ----------------- */
        const gmvPerDay: Record<string, { actual: number; projected: number }> = {};
  
        [...closed, ...active].forEach((a) => {
          const end = calcEndDate(a.scheduledstart, a.auctionduration);
          if (!end) return;
  
          const day = new Date(end).toLocaleDateString("en-CA"); // YYYY-MM-DD
          const auctionStats = stats.find((s: any) => s.auctionId === a.id);
          const bestBid = auctionStats?.bestBid || 0;
  
          if (!gmvPerDay[day]) gmvPerDay[day] = { actual: 0, projected: 0 };
          if (end < now) gmvPerDay[day].actual += bestBid;
          else gmvPerDay[day].projected += bestBid;
        });
  
        const gmvTrendBase = Object.entries(gmvPerDay)
          .map(([date, { actual, projected }]) => ({
            date,
            gmv: actual,
            projectedGmv: projected,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
        /* ----------------- RISK INDEX (LIVE BASED ON BID DATES) ----------------- */
        const riskIndexData = gmvTrendBase.map((dayData) => {
          const sameDayBids = json.data.bids.filter((b: any) => {
            const bidDate = new Date(b.created_at).toLocaleDateString("en-CA");
            return bidDate === dayData.date;
          });
  
          const riskyCount = sameDayBids.filter(
            (b: any) => !b.user_id || Number(b.amount) < 100
          ).length;
  
          const riskIndex =
            sameDayBids.length > 0
              ? Math.min((riskyCount / sameDayBids.length) * 100, 100)
              : 0;
  
          return {
            ...dayData,
            riskIndex,
          };
        });
  
        setGmvTrend(riskIndexData);
  
        /* ===================== RECENT WINNERS ===================== */
        const winners = closed
          .sort((a, b) => {
            const endA =
              calcEndDate(a.scheduledstart, a.auctionduration)?.getTime() || 0;
            const endB =
              calcEndDate(b.scheduledstart, b.auctionduration)?.getTime() || 0;
            return endB - endA;
          })
          .slice(0, 3)
          .map((a) => {
            const auctionStats = stats.find((s: any) => s.auctionId === a.id);
            return {
              lot: a.productname,
              winnerId: auctionStats?.winnerId || "-",
              bid: auctionStats?.bestBid || 0,
            };
          });
  
        setRecentWinners(winners);
  
        /* ===================== AUCTIONS AT RISK (LIVE) ===================== */
        const liveAuctions = auctions.filter((a) => {
          const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
          const end = calcEndDate(a.scheduledstart, a.auctionduration);
          if (!start || !end) return false;
          return start <= now && end >= now;
        });
  
        const risks = liveAuctions.map((a) => {
          const auctionStats = stats.find((s: any) => s.auctionId === a.id);
          const bidCount = auctionStats?.bids || 0;
          const highestBid = auctionStats?.bestBid || 0;
  
          const issues: string[] = [];
          if (bidCount < 5) issues.push("Low bidders");
          if (highestBid < (a.reserve_price || 0)) issues.push("Reserve not met");
          if (
            bidCount /
              ((Date.now() - new Date(a.scheduledstart).getTime()) /
                (1000 * 60 * 60 * 24)) <
            5
          ) {
            issues.push("Low velocity");
          }
  
          return { auction: a.productname, issues };
        });
  
        setAtRisk(risks.filter((r) => r.issues.length > 0));
      } catch (err) {
        console.error("fetchBids error:", err);
      }
    };
  
    fetchBids();
  }, [auctions]);
  

  if (!user || user.role !== "admin") return null;

  /* ----------------- Derived data (stats) ----------------- */
  const now = new Date();

  // sale_type: 1 or 3 => Forward/Reverse; sale_type 2 => Buy Now
  const auctionList = auctions.filter((a) => a.sale_type === 1 || a.sale_type === 3);
  const buyNowList = auctions.filter((a) => a.sale_type === 2);

  // approved / pending for auctions (forward/reverse)
  const approvedAuctions = auctionList.filter((a) => !!a.approved);
  const pendingAuctions = auctionList.filter((a) => !a.approved);

  // Live/Upcoming/Closed computed by scheduledstart + auctionduration
  const liveCount = approvedAuctions.filter((a) => {
    const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
    const end = calcEndDate(a.scheduledstart, a.auctionduration);
    if (!start || !end) return false;
    return start <= now && end >= now;
  }).length;

  const upcomingCount = approvedAuctions.filter((a) => {
    const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
    if (!start) return false;
    return start > now;
  }).length;

  const closedCount = approvedAuctions.filter((a) => {
    const end = calcEndDate(a.scheduledstart, a.auctionduration);
    if (!end) return false;
    return end < now;
  }).length;

  // put this near your stats calculations:
const pendingAuctionsCount = auctions.filter(
  (a: any) => !a.approved && (a.sale_type === 1 || a.sale_type === 3)
).length;

const auctionStatusData = [
  { name: "Live", value: liveCount, color: "#15803D"  },      // blue
  { name: "Upcoming", value: upcomingCount, color: "#2563EB" }, // orange
  { name: "Closed", value: closedCount, color: "black" },  // green
  { name: "Pending", value: pendingAuctionsCount, color: "#F59E0B" }, // amber
];


  // Forward vs Reverse breakdowns
  const forwardList = approvedAuctions.filter((a) => String(a.auctiontype || "").toLowerCase() === "forward");
  const reverseList = approvedAuctions.filter((a) => String(a.auctiontype || "").toLowerCase() === "reverse");

  const forwardEnglish = forwardList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "standard").length;
  const forwardSilent = forwardList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "silent").length;
  const forwardSealed = forwardList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "sealed").length;

  const reverseStandard = reverseList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "standard").length;
  const reverseRanked = reverseList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "ranked").length;
  const reverseSealed = reverseList.filter((a) => String(a.auctionsubtype || "").toLowerCase() === "sealed").length;

// ✅ UPDATED CODE: Unified logic for Forward & Reverse auction state breakdown

// ---------- Forward Auction Status ----------
const forwardPendingCount = auctions.filter(
  (a) => !a.approved && String(a.auctiontype || "").toLowerCase() === "forward"
).length;

const forwardLive = forwardList.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return start && end && start <= now && end >= now;
}).length;

const forwardUpcoming = forwardList.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  return start && start > now;
}).length;

const forwardClosed = forwardList.filter((a) => {
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return end && end < now;
}).length;

const forwardStatusData = [
  { name: "Live", value: forwardLive, color: "#15803D" },
  { name: "Upcoming", value: forwardUpcoming, color: "#2563EB" },
  { name: "Closed", value: forwardClosed, color: "#000000" },
  { name: "Pending", value: forwardPendingCount, color: "#F59E0B" },
];


// ---------- Reverse Auction Status ----------
const reversePendingCount = auctions.filter(
  (a) => !a.approved && String(a.auctiontype || "").toLowerCase() === "reverse"
).length;

const reverseLive = reverseList.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return start && end && start <= now && end >= now;
}).length;

const reverseUpcoming = reverseList.filter((a) => {
  const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
  return start && start > now;
}).length;

const reverseClosed = reverseList.filter((a) => {
  const end = calcEndDate(a.scheduledstart, a.auctionduration);
  return end && end < now;
}).length;

const reverseStatusData = [
  { name: "Live", value: reverseLive, color: "#DC2626" },
  { name: "Upcoming", value: reverseUpcoming, color: "#2563EB" },
  { name: "Closed", value: reverseClosed, color: "#000000" },
  { name: "Pending", value: reversePendingCount, color: "#F59E0B" },
];


  // Bidders / Sellers pending
  const biddersPendingCount = bidders.filter((b) => !b.isadminapproved).length;
  const sellersPendingCount = sellers.filter((s) => !s.isadminapproved).length;

  // Buy Now pending
  const buyNowPendingCount = buyNowList.filter((a) => !a.approved).length;

  // Profiles lookup map for quick seller -> name resolution
  const profilesMap = new Map<string, any>();
  for (const p of [...sellers, ...bidders]) {
    if (p?.id) profilesMap.set(p.id, p);
  }

  /* ----------------- Page UI ----------------- */
  // Roboto hint. Prefer adding into global head or css, but keeping for dev.
  const robotoLink = (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
    />
  );

  return (
    <AdminLayout>
    {robotoLink}
    <p className="text-sm font-bold text-gray-500 mb-4"> DASHBOARD </p> 
    <div className="min-h-screen bg-transparent" style={{ fontFamily: "Roboto, sans-serif" }}>
      <div className="space-y-4">
{/* -------------------- KPI CARDS (Top 6) -------------------- */}
 

<div className="grid grid-cols-1 md:grid-cols-6 gap-6">
  {[
    {
      title: "Total Auctions",
      count: auctionList.length,
      icon: <Gavel className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/auctions",
      chartData: auctionStatusData,
      legend: auctionStatusData,
    },
    {
      title: "Forward Auctions",
      count: forwardList.length + forwardPendingCount,
      icon: <Gavel className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/auctions/forward",
      chartData: forwardStatusData,
      legend: forwardStatusData,
    },
    {
      title: "Reverse Auctions",
      count: reverseList.length + reversePendingCount,
      icon: <Gavel className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/auctions/reverse",
      chartData: reverseStatusData,
      legend: reverseStatusData,
    },
    {
      title: "Bidders / Buyers",
      count: bidders.length,
      icon: <Users className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/bidders",
      chartData: [
        { name: "Total", value: bidders.length },
        { name: "Pending", value: biddersPendingCount },
      ],
      legend: [
        { name: "Total", value: bidders.length },
        { name: "Pending", value: biddersPendingCount },
      ],
    },
    {
      title: "Suppliers / Sellers",
      count: sellers.length,
      icon: <Building className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/sellers",
      chartData: [
        { name: "Total", value: sellers.length },
        { name: "Pending", value: sellersPendingCount },
      ],
      legend: [
        { name: "Total", value: sellers.length },
        { name: "Pending", value: sellersPendingCount },
      ],
    },
    {
      title: "Buy Now Products",
      count: buyNowList.length,
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      link: "/admin-panel/buynow",
      chartData: [
        { name: "Total", value: buyNowList.length },
        { name: "Pending", value: buyNowPendingCount },
      ],
      legend: [
        { name: "Total", value: buyNowList.length },
        { name: "Pending", value: buyNowPendingCount },
      ],
    },
  ].map((card, i) => {
    const bluePalette = ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD"];

    return (
      <Link key={i} href={card.link} className="block group">
        <Card
          className={`rounded-xl border border-blue-200 bg-white
            transition-transform duration-300 hover:scale-105 hover:shadow-lg
            h-[265px] flex flex-col justify-between cursor-pointer`}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            {/* HEADER */}
            <div>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-full transition-all duration-300 group-hover:scale-110
                    group-hover:bg-blue-100`}
                >
                  {card.icon}
                </div>

                <div>
                  <div className="text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    {card.count}
                  </div>
                  <div className="text-xs font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </div>
                </div>
              </div>
              <div className="h-[1px] w-full bg-black/10 my-2"></div>
            </div>

            {/* CHART */}
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                {card.title.includes("Auction") ? (
                  <PieChart>
                    <Pie
                      data={card.chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                    >
                      {card.chartData.map((_, j) => (
                        <Cell
                          key={j}
                          fill={bluePalette[j % bluePalette.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    data={card.chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {card.chartData.map((_, j) => (
                        <Cell
                          key={j}
                          fill={bluePalette[j % bluePalette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* LEGEND */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mt-2 text-gray-600">
              {card.legend.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: bluePalette[idx % bluePalette.length],
                    }}
                  ></span>
                  {s.name}: {s.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  })}
</div>


        {/* -------------------- MAIN DASHBOARD BELOW -------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 mt-6">
          {/* LEFT COLUMN - 75% WIDTH */}
          <div className="space-y-6">
            {/* ---------------- Live Activity ---------------- */}
            <Card className="rounded-xl border border-blue-200 shadow-sm h-[400px] ">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                {/* Left section: icon + title together */}
                <div className="flex items-center gap-2">
                  <Radar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Live activity</h3>
                </div>

                {/* Right section: subtitle */}
                <span className="text-xs text-gray-500">Bids per minute and top auctions</span>
              </div>
                
                  {/* Activity Bar & Stats */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Activity gradient blocks (inverted) */}
                    <div className="flex-1 flex items-start gap-1">
                      {bidStats.slice(0, 10).map((b, idx) => {
                        const maxBids = Math.max(...bidStats.map((x: any) => x.bids || 1), 1);
                        const height = Math.max(8, Math.round((b.bids / maxBids) * 48)); // 8px–28px
                        return (
                          <div
                            key={idx}
                            className="w-full rounded-sm bg-gradient-to-b from-blue-100 to-blue-400"
                            style={{ height }}
                          ></div>
                        );
                      })}
                    </div>
  
                    {/* Total bids/min */}
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 leading-none">bids/min</p>
                        <p className="text-xl font-semibold text-gray-900">{totalBidRate}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          totalBidRate > 150
                            ? "bg-green-100 text-green-700"
                            : totalBidRate > 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {totalBidRate > 150
                          ? "Healthy"
                          : totalBidRate > 50
                          ? "At risk"
                          : "Needs attention"}
                      </span>
                    </div>
                  </div>
  
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left text-gray-500 border-t border-b">
                          <th className="py-2 px-2 font-semibold">Auction</th>
                          <th className="py-2 px-2 font-semibold">Best bid</th>
                          <th className="py-2 px-2 font-semibold">Bid velocity</th>
                          <th className="py-2 px-2 font-semibold">Reserve</th>
                          <th className="py-2 px-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidStats.slice(0, 6).map((b, idx) => (
                          <tr
                            key={idx}
                            className="border-t hover:bg-blue-50/50"
                          >
                            <td className="py-2 px-2 text-gray-800">{b.auction}</td>
                            <td className="py-2 px-2 font-medium text-gray-900">
                              ${b.bestBid ?? "-"}
                            </td>
                            <td className="py-2 px-2">{b.bidVelocity}</td>
                            <td className="py-2 px-2">{b.reserve}</td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs  ${
                                  b.status === "Healthy"
                                    ? "bg-green-100 text-green-700"
                                    : b.status === "At risk"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
  
                  {/* Footer link */}
                  <div className="flex justify-end mt-3">
                    <a
                      href="/admin-panel/auctions/live-activity"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      All auctions live activity →
                    </a>
                  </div>
                </CardContent>
                </Card>
            {/* ---------------- Approval Requests ---------------- */}
            <Card className="rounded-xl border border-blue-200 shadow-sm">
              <CardContent className="p-4">
                {/* header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    {approvalFilter === "bidders" && <Users className="w-5 h-5 text-blue-500" />}
                    {approvalFilter === "suppliers" && <Building className="w-5 h-5 text-purple-500" />}
                    {approvalFilter === "auctions" && <Gavel className="w-5 h-5 text-green-500" />}
                    {approvalFilter === "buynow" && <ShoppingCart className="w-5 h-5 text-orange-500" />}
  
                    <h3 className="text-base font-bold text-gray-900">
                      {approvalFilter === "bidders" && `Approval Requests : New Bidders (${biddersPendingCount})`}
                      {approvalFilter === "suppliers" && `Approval Requests : New Suppliers (${sellersPendingCount})`}
                      {approvalFilter === "auctions" && `Approval Requests : New Auctions (${pendingAuctions.length})`}
                      {approvalFilter === "buynow" && `Approval Requests : Buy Now (${buyNowPendingCount})`}
                    </h3>
                  </div>
  
                  <div className="w-56">
                    <Listbox value={approvalFilter} onChange={setApprovalFilter}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left shadow-sm text-sm">
                          <span className="block truncate capitalize">{approvalFilter}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm z-50 ring-1 ring-black/5 overflow-auto">
                          <Listbox.Option value="bidders" className="px-3 py-2 hover:bg-blue-50 relative cursor-pointer">
                            Bidders
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-blue-100 px-2 py-0.5 rounded-full font-bold text-blue-700">{biddersPendingCount}</span>
                          </Listbox.Option>
                          <Listbox.Option value="suppliers" className="px-3 py-2 hover:bg-purple-50 relative cursor-pointer">
                            Suppliers
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-purple-100 px-2 py-0.5 rounded-full font-bold text-purple-700">{sellersPendingCount}</span>
                          </Listbox.Option>
                          <Listbox.Option value="auctions" className="px-3 py-2 hover:bg-green-50 relative cursor-pointer">
                            Auctions
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 px-2 py-0.5 rounded-full font-bold text-green-700">{pendingAuctions.length}</span>
                          </Listbox.Option>
                          <Listbox.Option value="buynow" className="px-3 py-2 hover:bg-orange-50 relative cursor-pointer">
                            Buy Now
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-orange-100 px-2 py-0.5 rounded-full font-bold text-orange-700">{buyNowPendingCount}</span>
                          </Listbox.Option>
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>
                </div>
  
                {/* Tables for each filter */}
                {/* Bidders */}
                {approvalFilter === "bidders" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="py-2 px-2 font-semibold text-left">Bidder Name</th>
                          <th className="py-2 px-2 font-semibold text-center">Phone</th>
                          <th className="py-2 px-2 font-semibold text-center">Email verified</th>
                          <th className="py-2 px-2 font-semibold text-center">User type</th>
                          <th className="py-2 px-2 font-semibold text-center">Identity proof</th>
                          <th className="py-2 px-2 font-semibold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidders.filter((b) => !b.isadminapproved).map((b, idx) => (
                        <tr
                        key={b.id ?? idx}
                        className="border-b hover:bg-blue-50 cursor-pointer"
                      >
                        <td className="p-2 text-left">
                          {/* Hover trigger wraps the whole cell, not just the name */}
                          <HoverProfileCard id={b.id}>
                            <div className="flex flex-col">
                              <span className="text-blue-600 underline cursor-pointer">
                                {`${b.fname || ""} ${b.lname || ""}`.trim()}
                              </span>
                              <i>
                                <div className="text-gray-600">{b.email || "-"}</div>
                                <div className="text-gray-600">{b.location || "-"}</div>
                              </i>
                            </div>
                          </HoverProfileCard>
                        </td>
                      
                        <td className="p-2 text-center">{b.phone || "-"}</td>
                      
                        <td className="p-2 text-center">
                          <span
                            className={
                              b.verified ? "text-green-600" : "text-red-600 font-bold"
                            }
                          >
                            {b.verified ? "Yes" : "No"}
                          </span>
                        </td>
                      
                        <td className="p-2 text-center">{b.type || "-"}</td>
                      
                        <td className="p-2 text-center">
                          {b.identityproof ? (
                            <a href={b.identityproof} target="_blank" rel="noreferrer">
                              <FileText className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      
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
                      
                        ))}
                        {bidders.filter((b) => !b.isadminapproved).length === 0 && (
                          <tr><td colSpan={8} className="p-4 text-center text-gray-500">No bidders pending approval</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
   
  {/* Suppliers */}
{approvalFilter === "suppliers" && (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border-collapse">
      <thead className="bg-purple-50">
        <tr>
          <th className="py-2 px-2 font-semibold text-left">Supplier Name</th>
          <th className="py-2 px-2 font-semibold text-center">Phone</th>
          <th className="py-2 px-2 font-semibold text-center">Email verified</th>
          <th className="py-2 px-2 font-semibold text-center">User type</th>
          <th className="py-2 px-2 font-semibold text-center">Identity proof</th>
          <th className="py-2 px-2 font-semibold text-center">Action</th>
        </tr>
      </thead>

      <tbody>
        {sellers.filter((s) => !s.isadminapproved).map((s, idx) => (
          <tr
            key={s.id ?? idx}
            className="border-b hover:bg-blue-50 cursor-pointer"
          >
            {/* Name + Email + Location cell identical to Bidders */}
            <td className="p-2 text-left">
              <HoverProfileCard id={s.id}>
                <div className="flex flex-col">
                  <span className="text-blue-600 underline cursor-pointer">
                    {`${s.fname || ""} ${s.lname || ""}`.trim()}
                  </span>
                  <i>
                    <div className="text-gray-600">{s.email || "-"}</div>
                    <div className="text-gray-600">{s.location || "-"}</div>
                  </i>
                </div>
              </HoverProfileCard>
            </td>

            {/* Phone */}
            <td className="p-2 text-center">{s.phone || "-"}</td>

            {/* Email verified */}
            <td className="p-2 text-center">
              <span
                className={
                  s.verified ? "text-green-600" : "text-red-600 font-bold"
                }
              >
                {s.verified ? "Yes" : "No"}
              </span>
            </td>

            {/* User type */}
            <td className="p-2 text-center">{s.type || "-"}</td>

            {/* Identity Proof */}
            <td className="p-2 text-center">
              {s.identityproof ? (
                <a
                  href={s.identityproof}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                </a>
              ) : (
                "-"
              )}
            </td>

            {/* Action buttons identical to Bidders */}
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
        ))}

        {sellers.filter((s) => !s.isadminapproved).length === 0 && (
          <tr>
            <td colSpan={8} className="p-4 text-center text-gray-500">
              No suppliers pending approval
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

                {/* Auctions */}
                {approvalFilter === "auctions" && (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border-collapse">
      <thead className="bg-green-50">
        <tr>
          <th className="py-2 px-2 font-semibold text-left">Auction</th>
          <th className="py-2 px-2 font-semibold text-left">Created by</th>
          <th className="py-2 px-2 font-semibold text-center">Type</th>
          <th className="py-2 px-2 font-semibold text-center">Format</th>
          <th className="py-2 px-2 font-semibold text-center">Start</th>
          <th className="py-2 px-2 font-semibold text-center">End</th>
          <th className="py-2 px-2 font-semibold text-center">Action</th>
        </tr>
      </thead>

      <tbody>
        {auctions
          .filter((a) => !a.approved && (a.sale_type === 1 || a.sale_type === 3))
          .map((a, idx) => {
            const creator = profilesMap.get(a.seller);
            const creatorName = creator
              ? `${creator.fname || ""} ${creator.lname || ""}`.trim()
              : "-";
            const start = a.scheduledstart
              ? formatDateShort(a.scheduledstart)
              : "-";
            const endDate = calcEndDate(a.scheduledstart, a.auctionduration);
            const end = endDate
              ? formatDateShort(endDate.toISOString())
              : "-";

            // Determine type pill color
            const type = (a.auctiontype || "-").toLowerCase();
            let typeColor = "bg-gray-100 text-gray-700";
            if (type === "forward")
              typeColor = "bg-green-100 text-green-700";
            else if (type === "reverse")
              typeColor = "bg-blue-100 text-blue-700";

            return (
              <tr
                key={a.id ?? idx}
                className="border-b hover:bg-blue-50 cursor-pointer"
              >
                {/* Auction name */}
                <td className="p-2 text-left text-gray-800 font-medium">
                  {a.productname || "-"}
                </td>

                {/* Created By with HoverProfileCard */}
                <td className="p-2 text-left">
                  {creator ? (
                    <HoverProfileCard id={creator.id}>
                      <div className="flex flex-col">
                        <span className="text-blue-600 underline cursor-pointer">
                          {creatorName}
                        </span>
                        <i>
                          <div className="text-gray-600">{creator.email || "-"}</div>
                          <div className="text-gray-600">{creator.location || "-"}</div>
                        </i>
                      </div>
                    </HoverProfileCard>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>

                {/* Type with colored pill */}
                <td className="p-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColor}`}
                  >
                    {a.auctiontype
                      ? a.auctiontype.charAt(0).toUpperCase() +
                        a.auctiontype.slice(1)
                      : "-"}
                  </span>
                </td>

                {/* Auction format */}
                <td className="p-2 text-center text-gray-700">
                  {a.auctionsubtype || "-"}
                </td>

                {/* Start */}
                <td className="p-2 text-center text-gray-700">{start}</td>

                {/* End */}
                <td className="p-2 text-center text-gray-700">{end}</td>

                {/* Actions */}
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

        {auctions.filter((a) => !a.approved && (a.sale_type === 1 || a.sale_type === 3)).length === 0 && (
          <tr>
            <td colSpan={7} className="p-4 text-center text-gray-500">
              No auctions pending approval
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

                {/* Buy Now */}
                {approvalFilter === "buynow" && (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border-collapse">
      <thead className="bg-orange-50">
        <tr>
          <th className="py-2 px-2 font-semibold text-left">Supplier / Seller</th>
          <th className="py-2 px-2 font-semibold text-left">Product name</th>
          <th className="py-2 px-2 font-semibold text-center">Category</th>
          <th className="py-2 px-2 font-semibold text-center">Sub-category</th>
          <th className="py-2 px-2 font-semibold text-center">Sale price</th>
          <th className="py-2 px-2 font-semibold text-center">Created on</th>
          <th className="py-2 px-2 font-semibold text-center">Action</th>
        </tr>
      </thead>

      <tbody>
        {auctions
          .filter((a) => !a.approved && a.sale_type === 2)
          .map((p, idx) => {
            const sup = profilesMap.get(p.seller);
            const supplierName = sup
              ? `${sup.fname || ""} ${sup.lname || ""}`.trim()
              : "Unknown Supplier";

            return (
              <tr
                key={p.id ?? idx}
                className="border-b hover:bg-blue-50 cursor-pointer"
              >
                {/* Supplier Name with HoverProfileCard identical to Bidders */}
                <td className="p-2 text-left">
                  {sup ? (
                    <HoverProfileCard id={sup.id}>
                      <div className="flex flex-col">
                        <span className="text-blue-600 underline cursor-pointer">
                          {supplierName}
                        </span>
                        <i>
                          <div className="text-gray-600">{sup.email || "-"}</div>
                          <div className="text-gray-600">{sup.location || "-"}</div>
                        </i>
                      </div>
                    </HoverProfileCard>
                  ) : (
                    <span className="text-gray-500">{supplierName}</span>
                  )}
                </td>

                {/* Product name */}
                <td className="p-2 text-gray-800 font-medium text-left">
                  {p.productname || "-"}
                </td>

                {/* Category */}
                <td className="p-2 text-center text-gray-700">
                  {p.categoryid || "-"}
                </td>

                {/* Sub-category */}
                <td className="p-2 text-center text-gray-700">
                  {p.subcategoryid || "-"}
                </td>

                {/* Sale price */}
                <td className="p-2 text-center text-gray-900 font-semibold">
                  {p.currency || ""}{" "}
                  {p.buy_now_price ? p.buy_now_price.toLocaleString() : "-"}
                </td>

                {/* Created on */}
                <td className="p-2 text-center text-gray-700">
                  {formatDateShort(p.createdat)}
                </td>

                {/* Action buttons identical to Bidders */}
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

        {auctions.filter((a) => !a.approved && a.sale_type === 2).length === 0 && (
          <tr>
            <td colSpan={7} className="p-4 text-center text-gray-500">
              No Buy Now products pending approval
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}
         
              </CardContent>
                </Card>
          </div>
  
          {/* RIGHT COLUMN - 25% WIDTH */}
          <div className="space-y-6">
            {/* ---------------- Revenue & Risk ---------------- */}
            <Card className="rounded-xl border border-blue-200 shadow-sm h-[400px]">
  <CardContent className="p-4">
    {/* Header */}
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-base font-bold text-gray-900">Revenue & risk</h3>
      <span className="text-xs text-gray-500">GMV trend & auction risk</span>
    </div>

    {/* KPI Summary */}
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div>
        <p className="text-xs text-gray-500">Total GMV</p>
        <p className="text-xs font-semibold text-gray-900">
          ${revenueRisk?.gmv?.toLocaleString() || 0}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Take rate</p>
        <p className="text-xs font-semibold text-gray-900">
          {revenueRisk?.takeRate
            ? `${revenueRisk.takeRate.toFixed(2)}%`
            : "0.00%"}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">At-risk auctions</p>
        <p className="text-xs font-semibold text-gray-900">
          {revenueRisk?.atRiskCount ?? 0}
        </p>
      </div>
    </div>

    {/* Chart */}
    <div className="w-full h-[220px]">
    <ResponsiveContainer>
  <ComposedChart
    data={gmvTrend}
    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
  >
    <defs>
      <linearGradient id="gmvActual" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="rgb(59,130,246)" stopOpacity={0.8} />
        <stop offset="95%" stopColor="rgb(59,130,246)" stopOpacity={0.2} />
      </linearGradient>
      <linearGradient id="gmvProjected" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="rgb(147,197,253)" stopOpacity={0.6} />
        <stop offset="95%" stopColor="rgb(191,219,254)" stopOpacity={0.1} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
    <XAxis
      dataKey="date"
      tick={{ fontSize: 10, fill: "#6b7280" }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fontSize: 10, fill: "#6b7280" }}
      axisLine={false}
      tickLine={false}
    />
    <Tooltip
      formatter={(value: number, name: string) => {
        switch (name) {
          case "gmv":
            return [`$${value.toLocaleString()}`, "Actual GMV"];
          case "projectedGmv":
            return [`$${value.toLocaleString()}`, "Projected GMV"];
          case "riskIndex":
            return [`${value.toFixed(1)}%`, "Risk Index"];
          default:
            return value;
        }
      }}
    />

    {/* Actual GMV (solid blue area) */}
    <Area
      type="monotone"
      dataKey="gmv"
      stroke="rgb(59,130,246)"
      fill="url(#gmvActual)"
      strokeWidth={2}
      dot={false}
      name="Actual GMV"
    />

    {/* Projected GMV (lighter dotted area) */}
    <Area
      type="monotone"
      dataKey="projectedGmv"
      stroke="rgb(147,197,253)"
      fill="url(#gmvProjected)"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      dot={false}
      name="Projected GMV"
    />

    {/* Risk Trend Line (green dashed) */}
    <Line
      type="monotone"
      dataKey="riskIndex"
      stroke="rgb(34,197,94)"
      strokeWidth={1.5}
      dot={false}
      strokeDasharray="3 3"
      name="Risk Index"
    />
  </ComposedChart>
</ResponsiveContainer>

    </div>

    {/* Footer */}
    <div className="flex justify-end mt-3">
      <a
        href="/admin-panel/analytics/revenue-risk"
        className="text-xs text-blue-600 hover:underline"
      >
        View detailed revenue analytics →
      </a>
    </div>
  </CardContent>
</Card>

  
            {/* ---------------- Recent Winners ---------------- */}
            <Card className="rounded-xl border border-blue-200 shadow-sm">
    <CardContent className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold text-gray-900">Recent winners</h3>
        <a href="/admin-panel/auctions/winners" className="text-xs text-blue-600 hover:underline">All</a>
      </div>
  
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-t border-b">
              <th className="py-2 px-2 font-semibold">Lot</th>
              <th className="py-2 px-2 font-semibold">Winner</th>
              <th className="py-2 px-2 font-semibold">Bid</th>
            </tr>
          </thead>
          <tbody>
            {recentWinners.length > 0 ? (
              recentWinners.map((w, idx) => (
                <tr key={idx} className="border-t hover:bg-blue-50/50">
                  <td className="py-2 px-2 text-gray-800">{w.lot}</td>
                  <td className="py-2 px-2 text-gray-700">{w.winnerId}</td>
                  <td className="py-2 px-2 font-medium text-gray-900">${w.bid.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="py-3 text-center text-gray-500">No winners yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
                </Card>
  
            {/* ---------------- Auctions at Risk ---------------- */}
            <Card className="rounded-xl border border-blue-200 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-base font-bold text-gray-900">Auctions at risk</h3>
                            </div>
  
                            {atRisk.length > 0 ? (
                              <>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="text-gray-500 border-t border-b">
                                        <th className="text-left py-2 px-2 font-semibold">Auction</th>
                                        <th className="text-center py-2 px-2 font-semibold">Issues</th>
                                      
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {atRisk.slice(0, 5).map((r, idx) => (
                                        <tr key={idx} className="border-t hover:bg-blue-50/50">
                                          {/* Auction Name */}
                                          <td className="text-left py-2 px-2 text-gray-800">{r.auction}</td>
  
                                          {/* Issues */}
                                          <td className="text-center py-2 px-2">
                                            <div className="flex gap-1 flex-wrap">
                                              {r.issues.map((issue: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                    issue === "Low bidders"
                                                      ? "bg-yellow-100 text-yellow-700"
                                                      : issue === "Reserve not met"
                                                      ? "bg-red-100 text-red-700"
                                                      : "bg-orange-100 text-orange-700"
                                                  }`}
                                                >
                                                  {issue}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
  
                                         
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
  
                                {/* Footer link */}
                                <div className="flex justify-end mt-3">
                                  <a
                                    href="/admin-panel/auctions/at-risk"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View all at-risk auctions →
                                  </a>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-500">No auctions currently at risk</p>
                            )}
                          </CardContent>
                </Card>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
  
);
}





