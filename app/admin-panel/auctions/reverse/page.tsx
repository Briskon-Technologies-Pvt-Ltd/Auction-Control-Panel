"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Gavel,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  CheckCircle,
  XCircle,
  Activity,
  Trophy,
  MapPin,
  Award,
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
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

 
/* ---------------- Helpers ---------------- */
function calcEndDate(
  start?: string | null,
  dur?: { days?: number; hours?: number; minutes?: number } | null
): Date | null {
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

/* ---------------- CSV helper ---------------- */
function csvEscape(val: any) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/* ---------------- Modal ---------------- */
function Modal({ open, title, onClose, children }: any) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden"
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
        <div className="p-4 max-h-[75vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ---------------- Reverse winners summary fetch helper ---------------- */
async function fetchWinnersSummary() {
  try {
    const res = await fetch("/api/all-winners?type=reverse");
    const json = await res.json();
    if (json?.success && json.summary) {
      return json.summary;
    }
    return {
      total_closed: 0,
      Awarded: 0,
      "Not awarded": 0,
      total_awarded_value: 0,
      average_awarded_value: 0,
    };
  } catch (err) {
    console.error("Error fetching reverse winners summary:", err);
    return {
      total_closed: 0,
      Awarded: 0,
      "Not awarded": 0,
      total_awarded_value: 0,
      average_awarded_value: 0,
    };
  }
}

/* ---------------- Page (Reverse Auctions Dashboard) ---------------- */
export default function ReverseAuctionsDashboard() {
  const { user } = useAuth();

  /* ---------------- State Management ---------------- */
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [bids, setBids] = useState<any[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalList, setModalList] = useState<any[]>([]);

  // Bids Modal
  const [bidsModalAuction, setBidsModalAuction] = useState<any | null>(null);
  const [bidsModalList, setBidsModalList] = useState<any[]>([]);
  const [bidsModalOpen, setBidsModalOpen] = useState(false);
  const [bidsModalTitle, setBidsModalTitle] = useState("");


  // Updated Winner Summary state structure (supports winners list too)]

const [winnerSummary, setWinnerSummary] = useState<any>({
  summary: {
    total_closed: 0,
    Awarded: 0,
    "Not awarded": 0,
    total_awarded_value: 0,
    average_awarded_value: 0,
  },
  winners: [],
});


  const [winners, setWinners] = useState<any[]>([]);

  /* ---------------- Data Fetching ---------------- */
  useEffect(() => {
    if (!user || user.role !== "admin") return;
  
    // ✅ Load reverse auctions
    const loadAuctions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reverse-auctions");
        const json = await res.json();
        if (json?.success) {
          setData(json.data);
        } else {
          console.warn("No reverse auction data found");
          setData(null);
        }
      } catch (err) {
        console.error("reverse-auctions fetch error:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
  
    // ✅ Load all bids
    const loadBids = async () => {
      setBidsLoading(true);
      try {
        const res = await fetch("/api/bids");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data?.bids)) {
          setBids(json.data.bids);
        } else {
          console.warn("No bids data found or invalid response structure");
          setBids([]);
        }
      } catch (err) {
        console.error("bids fetch error:", err);
        setBids([]);
      } finally {
        setBidsLoading(false);
      }
    };
  
    // ✅ Load winners + summary (combined API)
    const loadWinners = async () => {
      try {
        const res = await fetch("/api/all-winners?type=reverse");
        const json = await res.json();
  
        // 👀 Debug line — check API structure in console
        console.log("🎯 Reverse Winners API Response:", json);
  
        if (json?.success) {
          setWinnerSummary({
            summary: json.summary || {
              total_closed: 0,
              Awarded: 0,
              "Not awarded": 0,
              total_awarded_value: 0,
              average_awarded_value: 0,
            },
            // ✅ handle both possible response structures
            winners: Array.isArray(json.winners)
              ? json.winners
              : Array.isArray(json.data?.winners)
              ? json.data.winners
              : [],
          });
        } else {
          console.warn("No winners found or API unsuccessful");
          setWinnerSummary({
            summary: {
              total_closed: 0,
              Awarded: 0,
              "Not awarded": 0,
              total_awarded_value: 0,
              average_awarded_value: 0,
            },
            winners: [],
          });
        }
      } catch (err) {
        console.error("reverse-winners fetch error:", err);
        setWinnerSummary({
          summary: {
            total_closed: 0,
            Awarded: 0,
            "Not awarded": 0,
            total_awarded_value: 0,
            average_awarded_value: 0,
          },
          winners: [],
        });
      }
    };
  
    // ✅ Parallel data loading for faster dashboard readiness
    const loadAll = async () => {
      try {
        await Promise.all([loadAuctions(), loadBids(), loadWinners()]);
      } catch (err) {
        console.error("Error loading reverse auction dashboard data:", err);
      }
    };
  
    loadAll();
  }, [user]);
  
  /* ---------------- Derived Data ---------------- */
  const summary =
    data?.summary ?? { total: 0, Live: 0, Upcoming: 0, Closed: 0, Pending: 0 };

  const subtypes =
    data?.subtypes ?? {
      standard: { total: 0, status: {} },
      ranked: { total: 0, status: {} },
      sealed: { total: 0, status: {} },
    };

  const auctions = data?.auctions ?? [];
  const financials =
    data?.financials ?? { totalGMV: 0, averageAuctionValue: 0, commission: 0 };
  const outcomes = data?.outcomes ?? { successful: 0, unsold: 0 };

  /* ---------------- Enrich Auctions ---------------- */
  const enrichedAuctions = useMemo(() => {
    if (!Array.isArray(auctions) || !Array.isArray(bids)) return auctions || [];
    const bidMap = Object.fromEntries(bids.map((b: any) => [b.id, b]));
    return auctions.map((a: any) => ({
      ...a,
      bids: (a.bids || []).map((b: any) => ({
        ...b,
        ...(bidMap[b.id] || {}),
      })),
    }));
  }, [auctions, bids]);

  /* ---------------- Modals ---------------- */
  const openModalFilter = (opts: { status?: string; subtype?: string }) => {
    let list = [...(enrichedAuctions || [])];

    if (opts.status) {
      const now = new Date();
      list = list.filter((a: any) => {
        const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
        const end = calcEndDate(a.scheduledstart, a.auctionduration);
        const approved =
          !!a.approved || String(a.approved).toLowerCase() === "true";
        const hasBids = Array.isArray(a.bids) && a.bids.length > 0;
        const current = hasBids
          ? Math.min(...a.bids.map((b: any) => Number(b.amount || 0)))
          : a.currentbid || 0;

        switch (opts.status) {
          case "Live":
            return approved && start && end && start <= now && end >= now;
          case "Upcoming":
            return approved && start && start > now;
          case "Closed":
            return approved && end && end < now;
          case "Pending":
            return !approved;
          case "Awarded":
            return approved && end && end < now && hasBids && current > 0;
          case "Not awarded":
            return approved && end && end < now && (!hasBids || current <= 0);
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

  const openBidsModal = (auction: any) => {
    const bidsArr = Array.isArray(auction.bids) ? auction.bids : [];
    if (!bidsArr.length) return;

    const sorted = bidsArr
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    setBidsModalAuction(auction);
    setBidsModalList(sorted);
    setBidsModalTitle(`Bids for: ${auction.productname || "Auction"}`);
    setBidsModalOpen(true);
  };

  /* ---------------- CSV Export ---------------- */
  const exportCSV = () => {
    const rows: string[] = [];
    const headers = [
      "id",
      "productname",
      "buyer",
      "status",
      "start",
      "end",
      "bids",
      "currentbid",
      "currency",
    ];
    rows.push(headers.join(","));

    (enrichedAuctions || []).forEach((a: any) => {
      const bidsArr = (a.bids || []).filter(
        (b: any) => b && !isNaN(Number(b.amount))
      );
      const current = bidsArr.length
        ? Math.min(...bidsArr.map((b: any) => Number(b.amount)))
        : a.currentbid || 0;
      const start = a.scheduledstart
        ? new Date(a.scheduledstart).toISOString()
        : "";
      const end =
        calcEndDate(a.scheduledstart, a.auctionduration)?.toISOString() ?? "";
      const buyer = a.buyer_name || a.buyer || "";

      const lineArr = [
        csvEscape(a.id),
        csvEscape(a.productname),
        csvEscape(buyer),
        csvEscape(a.status || ""),
        csvEscape(start),
        csvEscape(end),
        csvEscape(bidsArr.length),
        csvEscape(current),
        csvEscape(a.currency || ""),
      ];

      rows.push(lineArr.join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reverse-auctions-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

    /* ---------------- Filters & Pagination ---------------- */
    const [statusFilter, setStatusFilter] = useState("Pending");
    const [subtypeFilter, setSubtypeFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
      // 🧭 Sorting states
    const [sortColumn, setSortColumn] = useState("endDate"); // default sort by End Date
    const [sortOrder, setSortOrder] = useState("asc"); // ascending = earliest first

/* ---------------- Filters + Sorting + Pagination ---------------- */
const filtered = useMemo(() => {
  if (!Array.isArray(auctions)) return [];

  // ✅ Apply filters first
  let list = auctions
    .filter((a: any) =>
      !statusFilter
        ? true
        : String(a.status || "").toLowerCase() ===
          statusFilter.toLowerCase()
    )
    .filter((a: any) =>
      !subtypeFilter
        ? true
        : String(a.auctionsubtype || "").toLowerCase() ===
          subtypeFilter.toLowerCase()
    )
    .filter((a: any) => {
      const term = searchTerm.toLowerCase();
      return (
        (a.productname || "").toLowerCase().includes(term) ||
        (a.buyer_name || "").toLowerCase().includes(term)
      );
    });

  // ✅ Sorting logic
  list = list.sort((a: any, b: any) => {
    const aVal =
      sortColumn === "endDate"
        ? calcEndDate(a.scheduledstart, a.auctionduration)
        : a[sortColumn];
    const bVal =
      sortColumn === "endDate"
        ? calcEndDate(b.scheduledstart, b.auctionduration)
        : b[sortColumn];

    if (!aVal || !bVal) return 0;

    if (sortOrder === "asc") {
      return new Date(aVal).getTime() - new Date(bVal).getTime();
    } else {
      return new Date(bVal).getTime() - new Date(aVal).getTime();
    }
  });

  return list;
}, [
  auctions,
  statusFilter,
  subtypeFilter,
  searchTerm,
  sortColumn,
  sortOrder,
]);

const paginated = useMemo(() => {
  const startIndex = page * 10;
  return filtered.slice(startIndex, startIndex + 10);
}, [filtered, page]);

    /* ---------------- Auctions Over Time (Monthly Spread) ---------------- */
    const overTime = useMemo(() => {
      if (!Array.isArray(auctions) || auctions.length === 0) return [];
  
      const map: Record<string, any> = {};
  
      auctions.forEach((a: any) => {
        const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
        if (!start || isNaN(start.getTime())) return;
  
        const month = start.toLocaleString("default", { month: "short" });
        const year = start.getFullYear();
        const key = `${year}-${month}`;
        const subtype = String(a.auctionsubtype || "standard").toLowerCase();
  
        if (!map[key]) {
          map[key] = {
            month: `${month} ${year}`,
            Total: 0,
            Standard: 0,
            Ranked: 0,
            Sealed: 0,
          };
        }
  
        map[key].Total += 1;
        if (subtype.includes("rank")) map[key].Ranked += 1;
        else if (subtype.includes("seal")) map[key].Sealed += 1;
        else map[key].Standard += 1;
      });
  
      // Sort chronologically
      return Object.values(map).sort((a: any, b: any) => {
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");
        return (
          new Date(`${aMonth} 1, ${aYear}`).getTime() -
          new Date(`${bMonth} 1, ${bYear}`).getTime()
        );
      });
    }, [auctions]);
  
  /* ---------------- Final JSX Return ---------------- */
  return (
   
 
    <AdminLayout>
      <p className="text-sm font-bold text-gray-500 mb-4">REVERSE AUCTIONS</p>

 {/* ---------------- Reverse Auctions Summary Pills ---------------- */}
      <div className="flex flex-wrap gap-3 mt-2 mb-4">
        {/* Total Reverse Auctions */}
        <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 rounded-full px-3 py-1.5 cursor-default">
          <Gavel className="w-4 h-4 text-slate-700" />
          <span className="text-xs text-slate-700">Total Reverse</span>
          <span className="ml-1 bg-slate-200 px-2 py-0.5 rounded-full text-xs font-semibold text-slate-800">
            {summary?.total || 0}
          </span>
        </button>

        {/* Live Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Live" })}
          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <Clock className="w-4 h-4 text-green-700" />
          <span className="text-xs text-green-800">Live</span>
          <span className="ml-1 bg-green-200 text-green-900 px-2 py-0.5 rounded-full text-xs font-semibold">
            {summary?.Live || 0}
          </span>
        </button>

        {/* Upcoming Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Upcoming" })}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <Clock className="w-4 h-4 text-blue-700" />
          <span className="text-xs text-blue-800">Upcoming</span>
          <span className="ml-1 bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full text-xs font-semibold">
            {summary?.Upcoming || 0}
          </span>
        </button>

        {/* Pending Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Pending" })}
          className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <Gavel className="w-4 h-4 text-amber-700" />
          <span className="text-xs text-amber-800">Pending</span>
          <span className="ml-1 bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-semibold">
            {summary?.Pending || 0}
          </span>
        </button>

        {/* Closed Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Closed" })}
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <Clock className="w-4 h-4 text-gray-700" />
          <span className="text-xs text-gray-800">Closed</span>
          <span className="ml-1 bg-gray-200 text-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold">
               {winnerSummary?.summary?.total_closed || 0}
          </span>
        </button>

        {/* Awarded Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Awarded" })}
          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4 text-green-700" />
          <span className="text-xs text-green-800">Awarded</span>
          <span className="ml-1 bg-green-200 text-green-900 px-2 py-0.5 rounded-full text-xs font-semibold">
          {winnerSummary?.summary?.Awarded || 0}
          </span>
        </button>

        {/* Not Awarded Auctions */}
        <button
          onClick={() => openModalFilter({ status: "Not awarded" })}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 transition rounded-full px-3 py-1.5 cursor-pointer"
        >
          <XCircle className="w-4 h-4 text-red-700" />
          <span className="text-xs text-red-800">Not awarded</span>
          <span className="ml-1 bg-red-200 text-red-900 px-2 py-0.5 rounded-full text-xs font-semibold">
          {winnerSummary?.summary?.["Not awarded"] || 0}
          </span>
        </button>
      </div>
      {/* --- PIE Charts and Line Chart for Auctions with time spread - Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
              {/* Pie chart for subtype distribution */}
              <div className="md:col-span-3">
                <Card className="h-[300px] border border-blue-200 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3">
                      <div className="flex items-center gap-2">
                        <PieIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">
                          Auction format distribution
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Total {summary?.total || 0} auctions
                      </span>
            </div>

            {(() => {
              const data = [
                { name: "Standard", value: subtypes?.standard?.total ?? 0, color: "#60A5FA" },
                { name: "Ranked", value: subtypes?.ranked?.total ?? 0, color: "#93C5FD" },
                { name: "Sealed", value: subtypes?.sealed?.total ?? 0, color: "#C4B5FD" },
              ].filter((d) => d.value > 0);

              if (data.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                    No auction data available
                  </div>
                );
              }

              return (
                <div className="flex flex-col items-center w-full">
                  <div className="w-[200px] h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={3}
                          labelLine={false}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${value} auctions`,
                            name,
                          ]}
                          contentStyle={{
                            fontSize: "12px",
                            borderRadius: "6px",
                            borderColor: "#E5E7EB",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ✅ Custom legends below the pie */}
                  <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-slate-700">
                    {data.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-slate-600">{d.name}</span>
                        <span className="text-slate-900 font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
                  </CardContent>
                </Card>
              </div>

              {/* Line chart for auctions over time */}
              <div className="md:col-span-7">
                  <Card className="h-[300px] border border-blue-200 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">
                            Auction spread (with time)
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">Monthly trend</span>
                      </div>

                      {(!overTime || overTime.length === 0) ? (
                        <div className="flex items-center justify-center h-[240px] text-sm text-slate-400">
                          No timeline data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={overTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF9" />
                            <XAxis dataKey="month" fontSize={11} tickLine={false} />
                            <YAxis fontSize={11} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                fontSize: "11px",
                                borderRadius: "6px",
                                borderColor: "#E5E7EB",
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={26}
                              wrapperStyle={{
                                fontSize: "11px",
                                color: "#374151",
                                marginTop: "6px",
                              }}
                            />
                            <Line type="monotone" dataKey="Total" stroke="#2563EB" strokeWidth={1} />
                            <Line type="monotone" dataKey="Standard" stroke="#60A5FA" strokeWidth={1} />
                            <Line type="monotone" dataKey="Ranked" stroke="#93C5FD" strokeWidth={1} />
                            <Line type="monotone" dataKey="Sealed" stroke="#C4B5FD" strokeWidth={1} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

              </div>
        </div>

     {/* 🏆 Reverse Auction Winners Insights and  Auction Winners - Tabular data rows   */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mt-4">
        <div className="md:col-span-3">                                
              <Card className="h-[300px] border border-blue-200 hover:shadow-md transition-all bg-white">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-slate-800">
                          Awarded value & winners overview
                        </h3>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-b pb-3 mb-3">
                      <div>
                        <span className="text-slate-600 text-[10px]">Total closed:</span>{" "}
                        <span className="font-semibold text-slate-800 text-[10px]">
                          {winnerSummary?.summary?.total_closed || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 text-[10px]">Awarded:</span>{" "}
                        <span className="font-semibold text-green-700 text-[10px]">
                          {winnerSummary?.summary?.Awarded || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 text-[10px]">Not awarded:</span>{" "}
                        <span className="font-semibold text-red-600 text-[10px]">
                          {winnerSummary?.summary?.["Not awarded"] || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 text-[10px]">Awarded value:</span>{" "}
                        <span className="font-semibold text-blue-700 text-[10px]">
                          USD{" "}
                          {Number(
                            winnerSummary?.summary?.total_awarded_value || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Chart: Distribution */}
                    {Array.isArray(winnerSummary?.winners) &&
                    winnerSummary.winners.length > 0 ? (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart
                          data={(() => {
                            const map: Record<string, any> = {};
                            (winnerSummary.winners || []).forEach((w: any) => {
                              // 🔹 Smart grouping logic:
                              const key =
                                w.category_name ||
                                w.categoryid ||
                                w.buyer_name ||
                                w.winner_location ||
                                "Others";

                              if (!map[key]) {
                                map[key] = { label: key, totalAwarded: 0, count: 0 };
                              }
                              map[key].totalAwarded += Number(w.winning_bid || 0);
                              map[key].count += 1;
                            });

                            return Object.values(map)
                              .sort((a: any, b: any) => b.totalAwarded - a.totalAwarded)
                              .slice(0, 6); // top 6 entries
                          })()}
                          layout="vertical"
                          barSize={22}
                          margin={{ top: 1, right:1, left:1, bottom: 1}}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: "#6B7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            dataKey="label"
                            type="category"
                            width={70}
                            tick={{ fontSize: 9, fill: "#374151" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(v: any) => [`USD ${v.toLocaleString()}`, "Awarded value"]}
                            contentStyle={{
                              fontSize: "8px",
                              borderRadius: "6px",
                              borderColor: "#E5E7EB",
                            }}
                          />
                          <Bar
                            dataKey="totalAwarded"
                            fill="#60A5FA"
                            name="Awarded value (USD)"
                            radius={[4, 4, 4, 4]}
                          >
                            <LabelList
                              dataKey="totalAwarded"
                              position="right"
                              fill="#1E3A8A"
                              fontSize={8}
                              formatter={(v: number) => v.toLocaleString()}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[230px] text-sm text-slate-400">
                        No awarded data available
                      </div>
                    )}
                  </div>

                  {/* Footer note */}
                  <div className="text-[10px] text-slate-500 text-right mt-auto pt-2">
                    Based on: Awarded reverse auctions
                  </div>
                </CardContent>
              </Card>
        </div>
                 {/*  Auction Winners - Tabular data */}
        <div className="md:col-span-7">    
              <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-slate-800">
                      Auction winners (Reverse)
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500">
                    {winnerSummary?.summary?.total_closed || 0} closed auctions
                  </div>
                </div>

                {!winnerSummary?.winners?.length ? (
                  <div className="text-center text-slate-400 text-sm py-12">
                    No winners found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-blue-50 border-b">
                        <tr>
                          <th className="p-2 text-left font-semibold text-slate-700">Auction name</th>
                          <th className="p-2 text-left font-semibold text-slate-700">Winner</th>
                          <th className="p-2 text-left font-semibold text-slate-700">Location</th>
                          <th className="p-2 text-right font-semibold text-slate-700">Winning bid</th>
                          <th className="p-2 text-right font-semibold text-slate-700">Total bids</th>
                          <th className="p-2 text-left font-semibold text-slate-700">Closed on</th>
                        </tr>
                      </thead>

                      <tbody>
                        {winnerSummary.winners.map((w: any, i: number) => {
                          const relatedAuction = enrichedAuctions.find(
                            (a: any) => a.id === w.auction_id
                          );
                          const totalBids = relatedAuction?.bids?.length || 0;

                          return (
                            <tr key={w.auction_id || i} className="border-b hover:bg-blue-50 transition">
                              {/* Auction Name */}
                              <td className="p-2 text-slate-800 font-medium">
                                {w.auction_name || "-"}
                              </td>

                              {/* Winner */}
                              <td className="p-2 text-slate-700">{w.winner_name}</td>

                              {/* Location */}
                              <td className="p-2 text-slate-500">{w.winner_location || "-"}</td>

                              {/* Winning Bid */}
                              <td className="p-2 text-right font-semibold text-blue-700">
                                {w.currency} {Number(w.winning_bid || 0).toLocaleString()}
                              </td>

                              {/* ✅ Total Bids (Clickable link) */}
                              <td className="p-2 text-right">
                                {totalBids > 0 ? (
                                  <button
                                    onClick={() => relatedAuction && openBidsModal(relatedAuction)}
                                    className="text-blue-600 hover:underline font-medium"
                                  >
                                    {totalBids} bids
                                  </button>
                                ) : (
                                  <span className="text-slate-400">0 bids</span>
                                )}
                              </td>

                              {/* Closed Date */}
                              <td className="p-2 text-slate-500">
                                {w.closed_at
                                  ? new Date(w.closed_at).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "2-digit",
                                    })
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              </Card>
        </div>    
      </div>
        {/* ----------------Category Wise - Auction Format BAR Chart ---------------- */}
        <div className="md:col-span-7 gap-4 mt-6">
              <Card className="h-[400px] border border-blue-200 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-800">
                        Auction formats & Category distribution 
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      By auction subtype (standard / ranked / sealed)
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={(() => {
                        // ✅ Aggregate by category & subtype
                        const categoryMap: Record<string, any> = {};
                        (enrichedAuctions || []).forEach((a: any) => {
                          const cat = a.categoryid || "Uncategorized";
                          const subtype = String(a.auctionsubtype || "standard").toLowerCase();
                          if (!categoryMap[cat]) {
                            categoryMap[cat] = { category: cat, standard: 0, ranked: 0, sealed: 0 };
                          }
                          if (subtype === "standard") categoryMap[cat].standard++;
                          else if (subtype === "ranked") categoryMap[cat].ranked++;
                          else if (subtype === "sealed") categoryMap[cat].sealed++;
                        });
                        return Object.values(categoryMap);
                      })()}
                      layout="vertical"
                      barSize={24}
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        type="number"
                        fontSize="10px"
                        tick={{ fill: "#6B7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="category"
                        type="category"
                        width={100}
                        fontSize="10px"
                        tick={{ fill: "#374151" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: "10px",
                          borderRadius: "6px",
                          borderColor: "#E5E7EB",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={24}
                        wrapperStyle={{ fontSize: "10px", color: "#374151" }}
                      />

                      {/* ✅ Stacked Bars by Subtype */}
                      <Bar dataKey="standard" stackId="a" fill="#60A5FA" name="Standard">
                        <LabelList dataKey="standard" position="insideRight" fill="#fff" fontSize={8} />
                      </Bar>
                      <Bar dataKey="ranked" stackId="a" fill="#93C5FD" name="Ranked">
                        <LabelList dataKey="ranked" position="insideRight" fill="#fff" fontSize={8} />
                      </Bar>
                      <Bar dataKey="sealed" stackId="a" fill="#C4B5FD" name="Sealed">
                        <LabelList dataKey="sealed" position="insideRight" fill="#fff" fontSize={8} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
        </div>
          {/* --- Bid activity trend + Active auctions snapshot --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Bid activity trend */}
            <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <div className="font-semibold text-slate-800">Bid activity trend</div>
                  </div>
                  <div className="text-xs text-slate-500">Weekly comparison by subtype</div>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(() => {
                        const weeklyMap: Record<string, any> = {};

                        (enrichedAuctions || []).forEach((a: any) => {
                          if (!a.bids) return;
                          const subtype = String(a.auctionsubtype || "unknown").toLowerCase();

                          a.bids.forEach((b: any) => {
                            const d = new Date(b.created_at);
                            if (isNaN(d.getTime())) return;
                            const month = d.toLocaleString("default", { month: "short" });
                            const weekNum = Math.ceil(d.getDate() / 7);
                            const weekLabel = `${month} W${weekNum}`;
                            const key = `${d.getFullYear()}-${month}-${weekNum}`;
                            if (!weeklyMap[key]) {
                              weeklyMap[key] = {
                                week: weekLabel,
                                timestamp: d.getTime(),
                                standard: 0,
                                ranked: 0,
                                sealed: 0,
                              };
                            }
                            weeklyMap[key][subtype] =
                              (weeklyMap[key][subtype] || 0) + 1;
                          });
                        });

                        return Object.values(weeklyMap).sort(
                          (a: any, b: any) => a.timestamp - b.timestamp
                        );
                      })()}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRnk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSld" x1="0" y1="0" x2="0" y2="1">
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
                      <Legend verticalAlign="bottom" height={10} wrapperStyle={{ fontSize: "11px" }} />
                      <Area
                        type="monotone"
                        dataKey="standard"
                        stackId="1"
                        stroke="#60A5FA"
                        fill="url(#colorStd)"
                        name="Standard"
                      />
                      <Area
                        type="monotone"
                        dataKey="ranked"
                        stackId="1"
                        stroke="#93C5FD"
                        fill="url(#colorRnk)"
                        name="Ranked"
                      />
                      <Area
                        type="monotone"
                        dataKey="sealed"
                        stackId="1"
                        stroke="#C4B5FD"
                        fill="url(#colorSld)"
                        name="Sealed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          {/* Active reverse auctions snapshot */}
            
            <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
            <CardContent className="p-3">
              {/* header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  </div>
                  <div className="font-semibold text-slate-800 text-sm">Active auctions snapshot</div>
                </div>
                <div className="text-[11px] font-bold text-blue-800">{summary?.Live || 0} currently : LIVE AUCTIONS</div>
              </div>

              {/* body */}
      <div className="space-y-1.5">
        {(() => {
          const nowMs = Date.now();

          const liveAuctions = (enrichedAuctions || [])
            .map((a: any) => {
              const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
              const end = calcEndDate(a.scheduledstart, a.auctionduration);
              const startMs = start ? start.getTime() : null;
              const endMs = end ? end.getTime() : null;
              const remainingMs = endMs != null ? Math.max(0, endMs - nowMs) : Number.POSITIVE_INFINITY;
              return { ...a, _startMs: startMs, _endMs: endMs, _remainingMs: remainingMs };
            })
            .filter((a: any) => a._startMs !== null && a._endMs !== null && a._startMs <= nowMs && a._endMs >= nowMs)
            .sort((a: any, b: any) => a._remainingMs - b._remainingMs)
            .slice(0, 6);

          if (liveAuctions.length === 0) {
            return <div className="text-[11px] text-slate-500">No live reverse auctions</div>;
          }

          return liveAuctions.map((a: any) => {
            const remainingMs = a._remainingMs || 0;
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const remainingText = remainingMs > 0 ? `${hours}h ${mins}m left` : "Ending soon";

            const auctionType = (a.auction_type || a.auctiontype || "").toString().toLowerCase();

            // bids array and count
          const bidsArr = Array.isArray(a.bids) ? a.bids : [];
          const bidsCount = a.total_bids ?? bidsArr.length ?? 0;

          // pick best bid: min for reverse, max otherwise
          let bestBid = null;
          if (bidsArr.length > 0) {
            if (auctionType === "reverse") {
              bestBid = bidsArr.reduce((min: any, b: any) =>
                Number(b.amount || 0) < Number(min.amount || 0) ? b : min
              , bidsArr[0]);
            } else {
              bestBid = bidsArr.reduce((max: any, b: any) =>
                Number(b.amount || 0) > Number(max.amount || 0) ? b : max
              , bidsArr[0]);
            }
          }

          // Determine supplier/creator name for display:
          // For reverse auctions the supplier is the bidder — prefer user_name
          // Fallbacks: creator_name, fname + lname, username, "Unknown Supplier"
          const bidderName =
            bestBid?.user_name ||
            bestBid?.creator_name ||
            ((bestBid?.fname || bestBid?.lname) ? `${bestBid?.fname || ""} ${bestBid?.lname || ""}`.trim() : null) ||
            bestBid?.username ||
            "Unknown Supplier";

          const bestAmt = bestBid ? Number(bestBid.amount || 0) : 0;
          const latestBidTime = a.last_bid_time
            ? new Date(a.last_bid_time).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            : "-";

          return (
            <div key={a.id} className="flex justify-between items-start border-b border-slate-100 pb-1.5 last:border-0">
              {/* left: auction + best offer */}
              <div className="flex flex-col text-[11px] leading-tight max-w-[70%]">
                  <div className="text-slate-800 font-medium truncate">
                    {a.productname || "-"}{" "}
                    <span className="text-slate-500 font-normal">
                    <i>  ({(a.auctionsubtype || a.auction_subtype || "Standard")
                        .charAt(0)
                        .toUpperCase() + (a.auctionsubtype || a.auction_subtype || "Standard")
                        .slice(1)
                        .toLowerCase()} auction :</i> created by- {a.buyer_name || a.creator_name || "Unknown Buyer"})
                    </span>
                  </div>

                {bestBid && bestAmt > 0 ? (
                  <div className="mt-0.5 text-slate-700 font-semibold">
                    Best Offer: <span className="text-blue-700">{a.currency ? `${a.currency} ` : ""}{bestAmt.toLocaleString()}</span>{" "}
                    <span className="text-slate-500 font-normal">from {bidderName}</span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-slate-400 italic">No supplier offers yet</div>
                )}
              </div>

              {/* right: time + bids count */}
            <div className="text-right text-[10px] flex flex-col items-end leading-tight min-w-[120px] sm:min-w-[140px]">
   
              <div className={`font-medium ${remainingMs > 0 ? "text-green-600" : "text-red-500"}`}>{remainingText}</div>
              
              <div
  className={`text-[11px] font-medium ${
    bidsCount > 0
      ? "text-blue-600 cursor-pointer hover:underline"
      : "text-slate-400 cursor-default"
  }`}
  onClick={() => bidsCount > 0 && openBidsModal(a)}
>
  {bidsCount} bids
</div>
   
              {bidsCount > 0 && (
                <div className="flex items-center gap-1 whitespace-nowrap text-slate-500">
                Last bid placed:  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{latestBidTime}</span>
                </div>
              )}    
</div>

            </div>
          );
        });
      })()}
    </div>

    {/* footer */}
    <div className="flex justify-end mt-2">
      <button onClick={() => openModalFilter({ status: "Live" })} className="text-[11px] text-blue-600 hover:underline">
        View all live auctions →
      </button>
    </div>
  </CardContent>
            </Card>
        </div>        
        {/* --- Top suppliers leaderboard + Supplier engagement map --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Top suppliers leaderboard */}
          <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <div className="font-semibold text-slate-800">
                  Top suppliers leaderboard
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Ranked by participation / awarded value
              </div>
            </div>

            <div className="space-y-2">
              {(() => {
                if (!bids || !bids.length)
                  return (
                    <div className="text-xs text-slate-400">
                      No bids data found
                    </div>
                  );

                // ✅ normalize auction type key
                const reverseBids = bids.filter((b: any) => {
                  const type =
                    String(b.auction_type || b.auctiontype || "").toLowerCase();
                  return type === "reverse";
                });

                if (!reverseBids.length)
                  return (
                    <div className="text-xs text-slate-400">
                      No reverse auction bids found
                    </div>
                  );

                const map: Record<string, any> = {};

                reverseBids.forEach((b: any) => {
                  const id = b.user_id || b.bidder_id || "unknown";
                  if (!map[id]) {
                    map[id] = {
                      id,
                      name:
                        b.user_name ||
                        b.bidder_name ||
                        b.fullname ||
                        b.username ||
                        "Anonymous Supplier",
                      location: b.location || b.city || "",
                      totalBids: 0,
                      totalValue: 0,
                      auctions: new Set(),
                    };
                  }
                  map[id].totalBids++;
                  map[id].totalValue += Number(b.amount || 0);
                  if (b.auction_id) map[id].auctions.add(b.auction_id);
                });

                const leaderboard = Object.values(map)
                  .map((b: any) => ({ ...b, auctionsCount: b.auctions.size }))
                  .sort((a: any, b: any) => b.totalValue - a.totalValue)
                  .slice(0, 10);

                if (!leaderboard.length)
                  return (
                    <div className="text-xs text-slate-400">
                      No leaderboard data available
                    </div>
                  );

                return leaderboard.map((b: any, i: number) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                      i < 3 ? "bg-blue-100" : "bg-white"
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
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

  {/* Supplier engagement map */}
  <Card className="border border-blue-200 hover:shadow-md transition-all bg-white">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <div className="font-semibold text-slate-800">
            Supplier engagement map
          </div>
        </div>
        <div className="text-xs text-slate-500">Reverse auctions only</div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={(() => {
            const reverseBids = (bids || []).filter(
              (b: any) =>
                String(b.auction_type || "").toLowerCase() === "reverse" &&
                b.location
            );
            const map: Record<string, any> = {};
            reverseBids.forEach((b: any) => {
              const loc = String(b.location || "").trim();
              if (!map[loc])
                map[loc] = { location: loc, totalBids: 0, totalValue: 0 };
              map[loc].totalBids++;
              map[loc].totalValue += Number(b.amount || 0);
            });
            return Object.values(map)
              .sort((a: any, b: any) => b.totalBids - a.totalBids)
              .slice(0, 8);
          })()}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 50, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            reversed
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <YAxis
            dataKey="location"
            type="category"
            orientation="right"
            width={130}
            tick={{ fontSize: 11, fill: "#374151" }}
          />
          <Tooltip
            formatter={(v: any, n: any) => [`${v.toLocaleString()}`, n]}
          />
          <Bar dataKey="totalBids" fill="#60A5FA" name="Total bids" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
        </div>


      {/* --- Reverse Auction Details Table --- */}
      <Card className="border border-blue-200 shadow-sm mt-6">
        <CardContent className="p-4">
          {/* Header Row — Filters + Search + Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {/* Left: Filters */}
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="border border-blue-200 text-sm rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Live">Live</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Subtype Filter */}
              <select
                value={subtypeFilter}
                onChange={(e) => {
                  setSubtypeFilter(e.target.value);
                  setPage(0);
                }}
                className="border border-blue-200 text-sm rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">All Formats</option>
                <option value="standard">Standard</option>
                <option value="ranked">Ranked</option>
                <option value="sealed">Sealed</option>
                <option value="silent">Silent</option>
              </select>
            </div>

            {/* Center: Search */}
            <div className="flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search auctions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full border border-blue-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Right: Export Button */}
            <Button
              onClick={exportCSV}
              className="bg-blue-50 text-blue-700 border border-blue-200 text-xs hover:bg-blue-100"
            >
              Export CSV
            </Button>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-blue-100 border-b text-slate-700">
                <tr>
                  {[
                    { key: "productname", label: "Auction name" },
                    { key: "auctionsubtype", label: "Format" },
                    { key: "buyer_name", label: "Buyer" },
                    { key: "scheduledstart", label: "Start date" },
                    { key: "endDate", label: "End date" },
                    { key: "currentbid", label: "Current bid" },
                    { key: "total_bids", label: "Bids" },
                    { key: "status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="p-2 text-left cursor-pointer select-none hover:text-blue-700"
                      onClick={() => {
                        if (sortColumn === col.key) {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortColumn(col.key);
                          setSortOrder("asc");
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortColumn === col.key && (
                          <span className="text-[10px]">
                            {sortOrder === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  {statusFilter === "Pending" && (
                    <th className="p-2 text-center">Action</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={statusFilter === "Pending" ? 9 : 8}
                      className="text-center text-slate-500 py-4 text-sm"
                    >
                      No auctions found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((a: any, i: number) => {
                    const endDate = calcEndDate(a.scheduledstart, a.auctionduration);

                    return (
                      <tr key={i} className="border-b hover:bg-slate-50 transition">
                        {/* Auction Name */}
                        <td className="p-2">
                        <button
                          onClick={() => openBidsModal(a)}
                          className="text-blue-700 underline hover:text-blue-900 font-medium"
                        >
                          {a.productname || "-"}
                        </button>
                      </td>

                        {/* Subtype */}
                        <td className="p-2 capitalize">{a.auctionsubtype || "-"}</td>

                        {/* Buyer Name (HoverProfileCard) */}
                        <td className="p-2">
                          {a.buyer_id ? (
                            <HoverProfileCard id={a.buyer_id}>
                              <span className="text-blue-600 underline cursor-pointer">
                                {a.buyer_name || "Unknown Buyer"}
                              </span>
                            </HoverProfileCard>
                          ) : (
                            <span>{a.buyer_name || "-"}</span>
                          )}
                        </td>

                        {/* Start Date */}
                        <td className="p-2">{formatDateShort(a.scheduledstart)}</td>

                        {/* End Date */}
                        <td className="p-2">
                          {endDate ? formatDateShort(endDate.toISOString()) : "-"}
                        </td>

                        {/* Current Bid */}
                        <td className="p-2 font-semibold">
                          {a.currentbid
                            ? `${a.currency || "USD"} ${a.currentbid}`
                            : "-"}
                        </td>

                        {/* Bids — Clickable */}
                        <td className="p-2 text-right">
                          {a.total_bids > 0 ? (
                            <button
                              onClick={() => openBidsModal(a)}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {a.total_bids} bids
                            </button>
                          ) : (
                            <span className="text-slate-400">0 bids</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              a.status === "Live"
                                ? "bg-green-50 text-green-700"
                                : a.status === "Upcoming"
                                ? "bg-blue-50 text-blue-700"
                                : a.status === "Pending"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        {/* Approve/Reject Buttons for Pending */}
                        {statusFilter === "Pending" && (
                          <td className="p-2 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                className="bg-green-50 text-green-700 border border-green-200 text-[11px] hover:bg-green-100"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-50 text-red-700 border border-red-200 text-[11px] hover:bg-red-100"
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-3 text-xs text-slate-600">
            <span>
              Showing {page * 10 + 1}–
              {Math.min((page + 1) * 10, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="text-xs border border-slate-200"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * 10 >= filtered.length}
                onClick={() =>
                  setPage((p) =>
                    (p + 1) * 10 < filtered.length ? p + 1 : p
                  )
                }
                className="text-xs border border-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* --- Modal for Filtered Auctions --- */}
      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      >
        {modalList.length === 0 ? (
          <div className="text-slate-500">No auctions match this filter</div>
        ) : (
          <div className="grid gap-2">
            {modalList.map((a: any) => {
              const end = calcEndDate(a.scheduledstart, a.auctionduration);
              return (
                <div
                  key={a.id}
                  className="border border-slate-100 rounded-md p-3 hover:shadow-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {a.productname}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.auctionsubtype} • Buyer: {a.buyer_name || "-"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 text-right">
                      <div>Start: {formatDateShort(a.scheduledstart)}</div>
                      <div>End: {end ? formatDateShort(end.toISOString()) : "-"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
      
      <Modal
            open={bidsModalOpen}
            title={bidsModalTitle}
            onClose={() => setBidsModalOpen(false)}
          >
            {bidsModalList.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6">
                No bids found for this auction.
              </div>
            ) : (
<div className="space-y-4">
  {/* ✅ Auction Details Summary */}
  {(() => {
    const auction = bidsModalAuction || {};
    const auctionType =
      (auction.auction_type || auction.auctiontype || "reverse").toLowerCase();
    const subtype =
      (auction.auctionsubtype || auction.auction_subtype || "-")
        .toString()
        .toLowerCase();
    const createdBy =
      auction.buyer_name ||
      auction.creator_name ||
      auction.created_by ||
      "Unknown";
    const start = auction.scheduledstart ? new Date(auction.scheduledstart) : null;
    const end =
      auction.scheduledstart && auction.auctionduration
        ? new Date(
            new Date(auction.scheduledstart).getTime() +
              Number(auction.auctionduration || 0) * 60000
          )
        : null;

    return (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
        <div>
          <span className="font-semibold text-slate-700">Auction type:</span>{" "}
          <span className="capitalize text-slate-800">{auctionType}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Format:</span>{" "}
          <span className="capitalize text-slate-800">{subtype}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Created by:</span>{" "}
          <span className="text-slate-800">{createdBy}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Total bids:</span>{" "}
          <span className="text-blue-700 font-semibold">
            {bidsModalList.length}
          </span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Start date:</span>{" "}
          <span className="text-slate-800">
            {start
              ? start.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">End date:</span>{" "}
          <span className="text-slate-800">
            {end
              ? end.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        </div>
        {auction.categoryid && (
          <div>
            <span className="font-semibold text-slate-700">Category:</span>{" "}
            <span className="text-slate-800">{auction.categoryid}</span>
          </div>
        )}
        {auction.id && (
          <div>
            <span className="font-semibold text-slate-700">Auction ID:</span>{" "}
            <span className="text-slate-800">{auction.id}</span>
          </div>
        )}
      </div>
    );
  })()}

  {/* ✅ Bids Table */}
  <div className="border border-slate-100 rounded-lg overflow-hidden">
    <table className="w-full text-xs border-collapse">
      <thead className="bg-slate-50 border-b">
        <tr>
          <th className="p-2 text-left font-semibold text-slate-700">Supplier</th>
          <th className="p-2 text-left font-semibold text-slate-700">Amount</th>
          <th className="p-2 text-left font-semibold text-slate-700">Time</th>
          <th className="p-2 text-left font-semibold text-slate-700">Location</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const minAmount = Math.min(
            ...bidsModalList.map((b: any) => Number(b.amount || 0))
          );
          return bidsModalList.map((b: any, i: number) => {
            const isLowest = Number(b.amount) === minAmount;
            return (
              <tr
                key={b.id || i}
                className={`border-b transition ${
                  isLowest
                    ? "bg-green-50 hover:bg-green-100"
                    : "hover:bg-slate-50"
                }`}
              >
                <td className="p-2 text-slate-800 font-medium">
                  {b.user_name || "Unknown Supplier"}
                </td>
                <td
                  className={`p-2 font-semibold ${
                    isLowest ? "text-green-700" : "text-blue-700"
                  }`}
                >
                  {b.currency ? `${b.currency} ` : ""}
                  {Number(b.amount || 0).toLocaleString()}
                  {isLowest && (
                    <span className="ml-1 text-[10px] text-green-700 font-medium">
                      (best offer)
                    </span>
                  )}
                </td>
                <td className="p-2 text-slate-500">
                  {new Date(b.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-2 text-slate-500">{b.location || "-"}</td>
              </tr>
            );
          });
        })()}
      </tbody>
    </table>
  </div>
</div>


            )}
      </Modal>


    </AdminLayout>
  );
}
