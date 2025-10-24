"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Plus,
  Gavel,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Users,
  Award,
  Wallet,
  Currency,
  DollarSign,
  CheckCircle,
  XCircle,
  Flame,
  Activity,
  Trophy,
  TrendingUp,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { tr } from "zod/v4/locales";

/* ---------------- Helpers ---------------- */
function calcEndDate(
  start?: string | null,
  dur?: { days?: number; hours?: number; minutes?: number }
) {
  if (!start) return null;
  const s = new Date(start);
  if (isNaN(s.getTime())) return null;
  const e = new Date(s);
  if (dur) {
    if (dur.days) e.setDate(e.getDate() + Number(dur.days || 0));
    if (dur.hours) e.setHours(e.getHours() + Number(dur.hours || 0));
    if (dur.minutes) e.setMinutes(e.getMinutes() + Number(dur.minutes || 0));
  }
  return e;
}

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

/* ---------------- Modal ---------------- */
function Modal({ open, title, onClose, children }: any) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="font-semibold text-slate-800">{title}</div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 px-2"
          >
            Close
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ---------------- Page (Forward Auctions Dashboard) ---------------- */
export default function ForwardAuctionsFirst8() {
  const { user } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: bids state
  const [bids, setBids] = useState<any[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState<any[]>([]);

  /* ---------------- Load Auctions + Bids ---------------- */
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const loadAuctions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/forward-auctions");
        const json = await res.json();
        if (json?.success) setData(json.data);
        else setData(null);
      } catch (err) {
        console.error("forward-auctions fetch error", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    const loadBids = async () => {
      setBidsLoading(true);
      try {
        const res = await fetch("/api/bids");
        const json = await res.json();
        if (json?.success) setBids(json.data?.bids || []);
        else setBids([]);
      } catch (err) {
        console.error("bids fetch error", err);
        setBids([]);
      } finally {
        setBidsLoading(false);
      }
    };

    loadAuctions();
    loadBids();
  }, [user]);

  const router = useRouter();

  /* ---------------- Extracted Variables ---------------- */
  const summary =
    data?.summary ?? { total: 0, Live: 0, Upcoming: 0, Closed: 0, Pending: 0 };
  const subtypes =
    data?.subtypes ?? {
      english: { total: 0, status: {} },
      silent: { total: 0, status: {} },
      sealed: { total: 0, status: {} },
    };
  const auctions = data?.auctions ?? [];
  const financials =
    data?.financials ?? { totalGMV: 0, averageAuctionValue: 0, commission: 0 };
  const outcomes = data?.outcomes ?? { successful: 0, unsold: 0 };
  const categoryPerformance = data?.categoryPerformance ?? [];
  const overTime = data?.overTime ?? [];

  /* ---------------- Modal Filter Logic ---------------- */
  const openModalFilter = (opts: { status?: string; subtype?: string }) => {
    let list = (auctions || []).slice();

    if (opts.status) {
      const now = new Date();
      list = list.filter((a: any) => {
        const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
        const end = calcEndDate(a.scheduledstart, a.auctionduration);
        const approved =
          !!a.approved || String(a.approved).toLowerCase() === "true";
        const hasBids = Array.isArray(a.bids) && a.bids.length > 0;
        const highestBid = hasBids
          ? Math.max(...a.bids.map((b: any) => Number(b.amount || 0)))
          : 0;

        switch (opts.status) {
          case "Live":
            return approved && start && end && start <= now && end >= now;
          case "Upcoming":
            return approved && start && start > now;
          case "Closed":
            return approved && end && end < now;
          case "Pending":
            return !approved;
          case "Sold":
            return approved && end && end < now && hasBids && highestBid > 0;
          case "Unsold":
            return approved && end && end < now && (!hasBids || highestBid <= 0);
          default:
            return false;
        }
      });
    }

    if (opts.subtype) {
      list = list.filter(
        (a: any) =>
          String(a.auctionsubtype || "").toLowerCase() ===
          String(opts.subtype).toLowerCase()
      );
    }

    setModalList(list);
    setModalTitle(
      [opts.subtype ?? "", opts.status ?? ""].filter(Boolean).join(" • ") ||
        "Auctions"
    );
    setModalOpen(true);
  };

  /* ---------------- CSV Export ---------------- */
  const exportCSV = () => {
    const rows: string[] = [];
    const headers = [
      "id",
      "productname",
      "seller",
      "status",
      "start",
      "end",
      "bids",
      "highest",
      "currency",
    ];
    rows.push(headers.join(","));
    (auctions || []).forEach((a: any) => {
      const bidsArr = (a.bids || []).filter(
        (b: any) => b && !isNaN(Number(b.amount))
      );
      const highest = bidsArr.length
        ? Math.max(...bidsArr.map((b: any) => Number(b.amount)))
        : 0;
      const start = a.scheduledstart
        ? new Date(a.scheduledstart).toISOString()
        : "";
      const end =
        calcEndDate(a.scheduledstart, a.auctionduration)?.toISOString() ?? "";
      const seller = a.seller_name || a.seller || "";
      const line = [
        a.id,
        `"${(a.productname || "").replace(/"/g, '""')}"`,
        `"${(seller || "").replace(/"/g, '""')}"`,
        a.status || "",
        start,
        end,
        bidsArr.length,
        highest,
        a.currency || "",
      ];
      rows.push(line.join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forward-auctions-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- Auction Detail Report Filters ---------------- */
  const [statusFilter, setStatusFilter] = useState("");
  const [subtypeFilter, setSubtypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return (auctions || [])
      .filter((a) =>
        !statusFilter
          ? true
          : String(a.status || "").toLowerCase() ===
            statusFilter.toLowerCase()
      )
      .filter((a) =>
        !subtypeFilter
          ? true
          : String(a.auctionsubtype || "").toLowerCase() ===
            subtypeFilter.toLowerCase()
      )
      .filter((a) => {
        const term = searchTerm.toLowerCase();
        return (
          (a.productname || "").toLowerCase().includes(term) ||
          (a.seller_name || "").toLowerCase().includes(term) ||
          (a.category_name || "").toLowerCase().includes(term)
        );
      });
  }, [auctions, statusFilter, subtypeFilter, searchTerm]);

  const paginated = useMemo(() => {
    const start = page * 10;
    return filtered.slice(start, start + 10);
  }, [filtered, page]);

  /* ---------------- CSV Export (Filtered) ---------------- */
  const exportCSVFiltered = () => {
    if (!filtered.length) return;
    const header = [
      "Auction Name",
      "Subtype",
      "Seller",
      "Start Date",
      "End Date",
      "Current Bid",
      "Bid Count",
      "Status",
    ].join(",");

    const rows = filtered.map((a) =>
      [
        `"${a.productname || ""}"`,
        a.auctionsubtype || "",
        `"${a.seller_name || ""}"`,
        formatDateShort(a.scheduledstart),
        formatDateShort(a.scheduledend),
        a.currentbid || "",
        a.bidcount || 0,
        a.status || "",
      ].join(",")
    );

    const blob = new Blob([header + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "forward_auction_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

/* ---------------- Derived Category Performance (Stacked Chart) ---------------- */
const categorySubtypeMap: Record<
  string,
  { english: number; silent: number; sealed: number }
> = {};

// Build a map by category_name (not ID)
(auctions || []).forEach((a: any) => {
  const cat = a.category_name || "Uncategorized";
  const subtype = String(a.auctionsubtype || "").toLowerCase();

  if (!categorySubtypeMap[cat]) {
    categorySubtypeMap[cat] = { english: 0, silent: 0, sealed: 0 };
  }

  if (["english", "standard"].includes(subtype))
    categorySubtypeMap[cat].english++;
  else if (subtype === "silent") categorySubtypeMap[cat].silent++;
  else if (subtype === "sealed") categorySubtypeMap[cat].sealed++;
});

// Convert the map into chart-friendly array
const categoryPerformanceStacked = Object.entries(categorySubtypeMap).map(
  ([name, values]) => ({
    name, // ✅ category_name (string)
    ...values,
    total: values.english + values.silent + values.sealed,
  })
);

// Optional: Sort by total count descending
categoryPerformanceStacked.sort((a, b) => b.total - a.total);


  if (!user || user.role !== "admin") return null;

return ( 
    <AdminLayout>
        {/* Header */}      
       <p className="text-sm font-bold text-gray-500 mb-4"> FORWARD AUCTIONS</p>

        {/* --- Forward Auctions Summary Pills --- */}
        <div className="flex flex-wrap justify-between items-center mt-2 mb-2">
              {/* Left section: summary badges */}
              <div className="flex flex-wrap gap-3">
                {/* Total Forward */}
                <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition rounded-full px-3 py-1.5 cursor-default">
                  <Gavel className="w-4 h-4 text-slate-700" />
                  <span className="text-xs text-slate-700">Total Forward</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold">
                    {summary?.total || 0}
                  </span>
                </div>

                {/* Live */}
                <button
                  onClick={() => openModalFilter({ status: "Live" })}
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-green-700" />
                  <span className="text-xs text-green-800">Live</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-green-200 text-green-900 text-xs font-semibold">
                    {summary?.Live || 0}
                  </span>
                </button>

                {/* Upcoming */}
                <button
                  onClick={() => openModalFilter({ status: "Upcoming" })}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span className="text-xs text-blue-800">Upcoming</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-xs font-semibold">
                    {summary?.Upcoming || 0}
                  </span>
                </button>

                {/* Pending */}
                <button
                  onClick={() => openModalFilter({ status: "Pending" })}
                  className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <Gavel className="w-4 h-4 text-amber-700" />
                  <span className="text-xs text-amber-800">Pending</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
                    {summary?.Pending || 0}
                  </span>
                </button>

                {/* Closed */}
                <button
                  onClick={() => openModalFilter({ status: "Closed" })}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-700">Closed</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                    {summary?.Closed || 0}
                  </span>
                </button>

                {/* Sold */}
                <button
                  onClick={() => openModalFilter({ status: "Sold" })}
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700">Sold</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-semibold">
                    {outcomes?.successful || 0}
                  </span>
                </button>

                {/* Unsold */}
                <button
                  onClick={() => openModalFilter({ status: "Unsold" })}
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 transition rounded-full px-3 py-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700">Unsold</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-semibold">
                    {outcomes?.unsold || 0}
                  </span>
                </button>
              </div>

              {/* Right section: Add Auction button */}
              <div className="flex justify-end">
                <button
                  onClick={() => router.push("/admin-panel/create-auction")}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-800 text-white px-4 py-2 rounded-full shadow-sm transition font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Auction</span>
                </button>
              </div>
        </div>

        {/* Auction format donut + Line Chart - Over time */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
          {/* Auction format donut */}
          <div className="md:col-span-3">
            <Card className="h-[300px] border border-blue-200 hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col items-center">
                {/* Header */}
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-blue-500" />
                    <div className="font-semibold text-slate-800">Auction format distribution</div>
                  </div>
                  <div className="text-xs text-slate-500">Total {summary?.total || 0} auctions</div>
                </div>

                {/* Donut Chart */}
                <div className="w-[200px] h-[200px] mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {(() => {
                        const englishCount =
                          subtypes?.english?.total ??
                          (Array.isArray(auctions)
                            ? auctions.filter(
                                (a) =>
                                  ["english", "standard"].includes(
                                    String(a.auctionsubtype || "").toLowerCase()
                                  ) &&
                                  String(a.auctiontype || "").toLowerCase() === "forward"
                              ).length
                            : 0);

                        const silentCount =
                          subtypes?.silent?.total ??
                          (Array.isArray(auctions)
                            ? auctions.filter(
                                (a) =>
                                  String(a.auctionsubtype || "").toLowerCase() === "silent" &&
                                  String(a.auctiontype || "").toLowerCase() === "forward"
                              ).length
                            : 0);

                        const sealedCount =
                          subtypes?.sealed?.total ??
                          (Array.isArray(auctions)
                            ? auctions.filter(
                                (a) =>
                                  String(a.auctionsubtype || "").toLowerCase() === "sealed" &&
                                  String(a.auctiontype || "").toLowerCase() === "forward"
                              ).length
                            : 0);

                        const subtypeData = [
                          { name: "English", value: englishCount, color: "#60A5FA" },
                          { name: "Silent", value: silentCount, color: "#93C5FD" },
                          { name: "Sealed", value: sealedCount, color: "#C4B5FD" },
                        ].filter((d) => d.value > 0);

                        if (subtypeData.length === 0)
                          return (
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="11"
                              fill="#9CA3AF"
                            >
                              No data
                            </text>
                          );

                        return (
                          <Pie
                            data={subtypeData}
                            dataKey="value"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                          >
                            {subtypeData.map((s, i) => (
                              <Cell key={i} fill={s.color} />
                            ))}
                          </Pie>
                        );
                      })()}
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legends */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 w-full justify-start mt-1">
                  {[
                    { label: "English", color: "#60A5FA", value: subtypes?.english?.total },
                    { label: "Silent", color: "#93C5FD", value: subtypes?.silent?.total },
                    { label: "Sealed", color: "#C4B5FD", value: subtypes?.sealed?.total },
                  ]
                    .filter((d) => (d.value ?? 0) > 0)
                    .map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-slate-600">{d.label}</span>
                        <span className="text-slate-900 font-semibold">{d.value}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line Chart - Over time */}
          <div className="md:col-span-7">
            <Card className="h-[300px] border border-blue-200 hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <div className="font-semibold text-slate-800">
                      Auction spread (with time)
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">Monthly trend</div>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overTime}>
                      <CartesianGrid stroke="#E6EEF9" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                      <Tooltip
                        contentStyle={{
                          fontSize: "12px",
                          borderRadius: "6px",
                          borderColor: "#E5E7EB",
                        }}
                        formatter={(value: any, name: any) => [
                          `${value}`,
                          `${name} Auctions`,
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={26}
                        wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#2563EB"
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="english"
                        name="English"
                        stroke="#60A5FA"
                        strokeWidth={1}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="silent"
                        name="Silent"
                        stroke="#93C5FD"
                        strokeWidth={1}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sealed"
                        name="Sealed"
                        stroke="#C4B5FD"
                        strokeWidth={1}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Snapshot + Category-wise auction formats */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mt-4">
          {/* Left Column - Financial Summary */}
          <div className="md:col-span-3">
            <Card className="h-[340px] border border-blue-200 hover:shadow-md transition-all bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-700">
                    Financial summary
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-normal">Total GMV</span>
                    <span className="text-slate-800 font-medium">
                      ${Number(financials.totalGMV || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-normal">Average auction value</span>
                    <span className="text-slate-800 font-medium">
                      ${Number(financials.averageAuctionValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-normal">Commission (5%)</span>
                    <span className="text-slate-800 font-medium">
                      ${Number(financials.commission || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Category Performance */}
          <div className="md:col-span-7">
            <Card className="h-[340px] border border-blue-200 hover:shadow-md transition-all">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <div className="font-semibold text-slate-800">Category wise performance</div>
                  </div>
                  <div className="text-xs text-slate-500">By different auction formats</div>
                </div>

                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryPerformanceStacked.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={140}
                        tick={{ fontSize: 12, fill: "#374151" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(96,165,250,0.1)" }}
                        contentStyle={{
                          fontSize: "12px",
                          borderRadius: "6px",
                          borderColor: "#E5E7EB",
                        }}
                      />
                      <Bar dataKey="english" stackId="a" fill="#60A5FA" name="English" />
                      <Bar dataKey="silent" stackId="a" fill="#93C5FD" name="Silent" />
                      <Bar dataKey="sealed" stackId="a" fill="#C4B5FD" name="Sealed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-start gap-5 mt-3 text-xs text-slate-700">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                    English
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#93C5FD]" />
                    Silent
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#C4B5FD]" />
                    Sealed
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Bid Lifecycle Heatmap + Active Auctions Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* 🔥 BID LIFECYCLE HEATMAP */}
          <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div className="font-semibold text-slate-800">Bid activity trend</div>
                </div>
                <div className="text-xs text-slate-500">Weekly comparison by subtype</div>
              </div>

              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(() => {
                      const weeklyMap: Record<string, any> = {};

                      (auctions || []).forEach((a: any) => {
                        if (!a.bids) return;
                        const subtype = String(a.auctionsubtype || "unknown").toLowerCase();

                        a.bids.forEach((b: any) => {
                          const d = new Date(b.created_at);
                          const month = d.toLocaleString("default", { month: "short" });
                          const weekNum = Math.ceil(d.getDate() / 7);
                          const weekLabel = `${month} W${weekNum}`;
                          const key = `${d.getFullYear()}-${month}-${weekNum}`;
                          if (!weeklyMap[key]) {
                            weeklyMap[key] = {
                              week: weekLabel,
                              timestamp: d.getTime(),
                              english: 0,
                              silent: 0,
                              sealed: 0,
                            };
                          }
                          weeklyMap[key][subtype] = (weeklyMap[key][subtype] || 0) + 1;
                        });
                      });

                      return Object.values(weeklyMap).sort(
                        (a: any, b: any) => a.timestamp - b.timestamp
                      );
                    })()}
                    margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: "12px",
                        borderRadius: "6px",
                        borderColor: "#E5E7EB",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={26}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="english"
                      stackId="1"
                      stroke="#60A5FA"
                      fill="url(#colorEng)"
                      name="English"
                    />
                    <Area
                      type="monotone"
                      dataKey="silent"
                      stackId="1"
                      stroke="#93C5FD"
                      fill="url(#colorSil)"
                      name="Silent"
                    />
                    <Area
                      type="monotone"
                      dataKey="sealed"
                      stackId="1"
                      stroke="#C4B5FD"
                      fill="url(#colorSea)"
                      name="Sealed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {/* 🟢 ACTIVE AUCTIONS SNAPSHOT */}
          <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* 🔴 Glowing live pulse icon */}
                    <div className="relative">
                      <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                    </div>
                    <div className="font-semibold text-slate-800">Active auctions snapshot</div>
                  </div>
                  <div className="text-xs font-bold text-blue-800">
                    {summary?.Live || 0} currently : LIVE AUCTIONS
                  </div>
                </div>

                {/* Active Auctions List */}
                <div className="space-y-2 max-h-[275px] overflow-y-auto pr-1">
                  {(auctions || [])
                    .filter((a: any) => {
                      const start = new Date(a.scheduledstart);
                      const end = calcEndDate(a.scheduledstart, a.auctionduration);
                      return start <= new Date() && end >= new Date() && a.approved;
                    })
                    .sort((a: any, b: any) => {
                      const lastA =
                        a.last_bid_time ? new Date(a.last_bid_time).getTime() : 0;
                      const lastB =
                        b.last_bid_time ? new Date(b.last_bid_time).getTime() : 0;
                      return lastB - lastA; // latest bid first
                    })
                    .slice(0, 6)
                    .map((a: any) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0"
                      >
                        <div className="flex flex-col text-xs">
                          <div className="text-slate-800 font-medium truncate max-w-[160px]">
                            {a.productname || "-"}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {a.seller_name || "Unknown Seller"}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-slate-800 font-semibold">
                            ${a.highest_bid || a.startprice || 0}
                          </div>
                          <div
                            className={`text-[11px] ${
                              a.total_bids > 0 ? "text-green-600" : "text-slate-400"
                            }`}
                          >
                            {a.total_bids || 0} bids
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Footer / See All */}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => openModalFilter({ status: "Live" })}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View all live auctions →
                  </button>
                </div>
              </CardContent>
          </Card>
        </div>
        {/* Top bidders Leaderboard Card  + Sellers performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <div className="font-semibold text-slate-800">Top bidders leaderboard</div>
                </div>
                <div className="text-xs text-slate-500">Ranked by total bid value</div>
              </div>

              <div className="space-y-2">
                {(() => {
                  if (!bids || !bids.length)
                    return <div className="text-xs text-slate-400">No bids available</div>;

                  // ✅ Group bids by user_id
                  const map: Record<string, any> = {};

                  bids.forEach((b: any) => {
                    const id = b.user_id;
                    if (!map[id]) {
                      map[id] = {
                        id,
                        name: b.user_name || "Anonymous Bidder",
                        location: b.location || "",
                        totalBids: 0,
                        totalValue: 0,
                        auctions: new Set(),
                        maxBid: 0,
                      };
                    }
                    map[id].totalBids += 1;
                    map[id].totalValue += Number(b.amount || 0);
                    map[id].auctions.add(b.auction_id);
                    map[id].maxBid = Math.max(map[id].maxBid, Number(b.amount || 0));
                  });

                  const leaderboard = Object.values(map)
                    .map((b: any) => ({
                      ...b,
                      auctionsCount: b.auctions.size,
                    }))
                    .sort((a: any, b: any) => b.totalValue - a.totalValue)
                    .slice(0, 10);

                  return leaderboard.map((b: any, i: number) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                        i === 0
                          ? "bg-blue-100"
                          : i === 1
                          ? "bg-blue-100"
                          : i === 2
                          ? "bg-blue-100"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold ${
                            i === 0
                              ? "bg-green-400 text-white"
                              : i === 1
                              ? "bg-blue-400 text-white"
                              : i === 2
                              ? "bg-purple-400 text-white"
                              : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {i + 1}
                        </div>

                        <div className="flex flex-col">
                          <div className="text-xs font-medium text-slate-800 truncate max-w-[140px]">
                            {b.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {b.totalBids} bids • {b.auctionsCount} auctions
                            {b.location ? ` • ${b.location}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-700">
                          ${b.totalValue.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">max ${b.maxBid}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <div className="font-semibold text-slate-800">Buyer engagement map</div>
                </div>
                <div className="text-xs text-slate-500">Forward auctions only</div>
              </div>

              <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const forwardBids = (bids || []).filter(
                    (b: any) => String(b.auction_type || "").toLowerCase() === "forward" && b.location
                  );

                  const map: Record<string, any> = {};
                  forwardBids.forEach((b: any) => {
                    const loc = b.location.trim();
                    if (!map[loc])
                      map[loc] = {
                        location: loc,
                        totalBids: 0,
                        totalValue: 0,
                        english: 0,
                        sealed: 0,
                        silent: 0,
                      };

                    map[loc].totalBids += 1;
                    map[loc].totalValue += Number(b.amount || 0);

                    const subtype = String(b.auction_subtype || "").toLowerCase();
                    if (subtype === "english") map[loc].english++;
                    else if (subtype === "sealed") map[loc].sealed++;
                    else if (subtype === "silent") map[loc].silent++;
                  });

                  return Object.values(map)
                    .sort((a: any, b: any) => b.totalBids - a.totalBids)
                    .slice(0, 8);
                })()}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 50, bottom: 0 }} // ✅ tighter margins
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

                {/* ✅ Reverse X-axis (bars grow right→left) */}
                <XAxis
                  type="number"
                  reversed
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* ✅ Move labels to right edge without padding gap */}
                <YAxis
                  dataKey="location"
                  type="category"
                  orientation="right"
                  width={130}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(v: any, n: any) => [`${v.toLocaleString()}`, n]}
                  contentStyle={{
                    fontSize: "12px",
                    borderRadius: "6px",
                    borderColor: "#E5E7EB",
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  height={26}
                  wrapperStyle={{ fontSize: "11px" }}
                />

                <Bar dataKey="english" stackId="a" fill="#60A5FA" name="English" />
                <Bar dataKey="sealed" stackId="a" fill="#C4B5FD" name="Sealed" />
                <Bar dataKey="silent" stackId="a" fill="#93C5FD" name="Silent" />
              </BarChart>
            </ResponsiveContainer>
              </div>

              {/* Legend summary */}
              <div className="flex justify-start gap-5 mt-3 text-xs text-slate-700">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                  English
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#C4B5FD]" />
                  Sealed
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#93C5FD]" />
                  Silent
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
 
         {/* ---------------- Auction Detail Report Table ---------------- */}
                         
            <Card className="border border-blue-200 shadow-sm hover:shadow-md transition-all mt-6">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Forward Auction Details
                    </h3>
                    <p className="text-xs text-slate-500">
                      Filter, search, or export detailed auction and bidding data
                    </p>
                  </div>

                  <Button
                    onClick={exportCSVFiltered}
                    className="bg-blue-50 text-blue-700 border border-blue-200 text-xs hover:bg-blue-100"
                  >
                    Export CSV
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4 items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                    className="border border-slate-300 rounded-md text-sm px-2 py-1 focus:ring-1 focus:ring-blue-300"
                  >
                    <option value="">All Status</option>
                    <option value="Live">Live</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <select
                    value={subtypeFilter}
                    onChange={(e) => {
                      setSubtypeFilter(e.target.value);
                      setPage(0);
                    }}
                    className="border border-slate-300 rounded-md text-sm px-2 py-1 focus:ring-1 focus:ring-blue-300"
                  >
                    <option value="">All Subtypes</option>
                    <option value="english">English</option>
                    <option value="silent">Silent</option>
                    <option value="sealed">Sealed</option>
                  </select>

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search auction, seller, or category..."
                    className="flex-1 min-w-[180px] border border-slate-300 rounded-md text-sm px-2 py-1 focus:ring-1 focus:ring-blue-300"
                  />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-blue-100 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="p-2 text-left">Auction name</th>
                        <th className="p-2 text-left">Format </th>
                        <th className="p-2 text-left">Supplier/seller</th>
                        <th className="p-2 text-left">Start date</th>
                        <th className="p-2 text-left">End date</th>
                        <th className="p-2 text-left">Highest bid</th>
                        <th className="p-2 text-left">Bid Count</th>
                        <th className="p-2 text-left">Last bid time</th>
                           <th className="p-2 text-center">Auction Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="text-center text-slate-500 py-6 text-sm"
                          >
                            No auctions found for current filters.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((a: any, i: number) => {
                          const endDate = calcEndDate(a.scheduledstart, a.auctionduration);
                          const lastBid = a.last_bid_time
                            ? formatDateShort(a.last_bid_time)
                            : "-";

                          return (
                            <tr
                              key={i}
                              className="border-b border-slate-100 hover:bg-slate-50 transition"
                            >
                              <td className="p-2 text-xs text-blue-700 underline cursor-pointer hover:text-blue-900"
                                  onClick={() => openModalFilter({ status: a.status, subtype: a.auctionsubtype })}>
                                {a.productname || "-"}
                              </td>
                              <td className="p-2 capitalize text-slate-700">
                                {a.auctionsubtype || "-"}
                              </td>
                              <td className="p-2 text-slate-700">
                                {a.seller_name || "-"}
                              </td>
                              <td className="p-2 text-slate-600 text-xs">
                                {formatDateShort(a.scheduledstart)}
                              </td>
                              <td className="p-2 text-slate-600 text-xs">
                                {endDate ? formatDateShort(endDate.toISOString()) : "-"}
                              </td>
                              <td className="p-2 text-slate-800 font-semibold">
                                {a.highest_bid
                                  ? `${a.currency || ""} ${a.highest_bid}`
                                  : "-"}
                              </td>
                              <td className="p-2 text-slate-700">{a.total_bids || 0}</td>
                              <td className="p-2 text-slate-600 text-xs">{lastBid}</td>
                                  <td className="p-2 text-center">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    a.status === "Live"
                                      ? "bg-green-50 text-green-700"
                                      : a.status === "Upcoming"
                                      ? "bg-blue-50 text-blue-700"
                                      : a.status === "Closed"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-yellow-50 text-yellow-700"
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 text-xs text-slate-600">
                  <span>
                    Showing {page * 10 + 1}–
                    {Math.min((page + 1) * 10, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                      className="text-xs"
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(page + 1) * 10 >= filtered.length}
                      onClick={() => setPage((p) => p + 1)}
                      className="text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Modal: show auction list for filters */}
        <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
          {modalList.length === 0 ? <div className="text-slate-500">No auctions match this filter</div> :
            <div className="grid gap-2">
              {modalList.map((a: any) => {
                const bids = (a.bids || []).filter((b:any)=>b && !isNaN(Number(b.amount)));
                const highest = bids.length ? Math.max(...bids.map((b:any)=>Number(b.amount))) : 0;
                const lastBid = bids.length ? bids.sort((x:any,y:any)=> new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0] : null;
                const seller = a.seller_name || a.seller || "-";
                const start = a.scheduledstart ? formatDateShort(a.scheduledstart) : "-";
                const end = calcEndDate(a.scheduledstart,a.auctionduration) ? formatDateShort(calcEndDate(a.scheduledstart,a.auctionduration).toISOString()) : "-";
                return (
                  <div key={a.id} className="border border-slate-100 rounded-md p-3 hover:shadow-sm transition">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{a.productname || a.auction_name || "Auction"}</div>
                        <div className="text-xs text-slate-500 mt-1">{a.auctionsubtype ? `${a.auctionsubtype} •` : ""} {a.categoryid ? `Category: ${a.categoryid}` : ""}</div>
                        <div className="text-xs text-slate-500 mt-1">Start: {start} • End: {end}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Seller</div>
                        <div className="text-sm font-medium text-slate-800">{seller}</div>
                        <div className="text-xs text-slate-500 mt-2">Bids</div>
                        <div className="text-sm font-medium text-slate-800">{bids.length}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
                      <div>Highest: {a.currency} {highest ? highest.toLocaleString() : "-"}</div>
                      <div>Last bid: {lastBid ? new Date(lastBid.created_at).toLocaleString() : "-"}</div>
                      <div>Reserve: {a.reserveprice ?? "-"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </Modal>
      
    </AdminLayout>
  );
}
