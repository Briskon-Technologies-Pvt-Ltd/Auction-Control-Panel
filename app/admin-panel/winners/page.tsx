"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  TrendingUp,
  Shuffle,
  UserCheck,
  Clock,
  Globe,
  Award,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
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
} from "recharts";


/* ---------------- Helper ---------------- */
function formatDateShort(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- Page ---------------- */
export default function WinnersPage() {
  const { user } = useAuth?.() ?? { user: null };
  const [winners, setWinners] = useState<any[]>([]);
  const [activePie, setActivePie] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchWinners = async () => {
      try {
        const res = await fetch("/api/all-winners");
        const data = await res.json();
        setWinners(data?.winners || []);
      } catch (err) {
        console.error("Failed to fetch winners", err);
        setWinners([]);
      }
    };
    fetchWinners();
  }, [user]);

  /* ---------------- Derived Analytics ---------------- */
  const total = winners.length;
  const forwardCount = winners.filter(
    (w) => w.auction_type?.toLowerCase() === "forward"
  ).length;
  const reverseCount = winners.filter(
    (w) => w.auction_type?.toLowerCase() === "reverse"
  ).length;
  const uniqueWinners = new Set(winners.map((w) => w.winner_id)).size;

  const totalForwardValue = winners
    .filter((w) => w.auction_type?.toLowerCase() === "forward")
    .reduce((s, w) => s + Number(w.winning_bid || 0), 0);

  const totalReverseValue = winners
    .filter((w) => w.auction_type?.toLowerCase() === "reverse")
    .reduce((s, w) => s + Number(w.winning_bid || 0), 0);

  const avgWinningValue = winners.length
    ? Math.round(
        winners.reduce((s, w) => s + Number(w.winning_bid || 0), 0) /
          winners.length
      )
    : 0;

  const winnersByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    (winners || []).forEach((w) => {
      const c = w.winner_location || "Unknown";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [winners]);

  const monthlyMap: Record<
    string,
    { date: Date; forwardCount: number; reverseCount: number }
  > = {};
  (winners || []).forEach((w) => {
    const d = new Date(w.closed_at);
    if (isNaN(d.getTime())) return;
    const key = `${d.toLocaleString("default", {
      month: "short",
    })} ${d.getFullYear()}`;
    if (!monthlyMap[key])
      monthlyMap[key] = {
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        forwardCount: 0,
        reverseCount: 0,
      };
    if (w.auction_type?.toLowerCase() === "forward")
      monthlyMap[key].forwardCount++;
    else monthlyMap[key].reverseCount++;
  });
  const winnersOverTime = Object.entries(monthlyMap)
    .map(([month, val]) => ({ month, ...val }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const topWinners = useMemo(() => {
    const map: Record<
      string,
      { name: string; count: number; value: number }
    > = {};
    for (const w of winners) {
      const id = String(w.winner_id || w.winner_name || Math.random());
      if (!map[id])
        map[id] = { name: w.winner_name || "-", count: 0, value: 0 };
      map[id].count += 1;
      map[id].value += Number(w.winning_bid || 0);
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [winners]);

  const colors = ["#1E3A8A", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

  /* ---------------- Search & Pagination ---------------- */
  const filteredWinners = winners.filter(
    (w) =>
      w.winner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.auction_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWinners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWinners = filteredWinners.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleExport = () => {
    const csv = [
      ["Winner", "Auction", "Type", "Location", "Amount", "Date"],
      ...filteredWinners.map((w) => [
        w.winner_name,
        w.auction_name,
        w.auction_type,
        w.winner_location,
        `${w.currency} ${w.winning_bid}`,
        formatDateShort(w.closed_at),
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auction_winners.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user || user.role !== "admin") return null;

  /* ---------------- Render ---------------- */
  return (
    <AdminLayout>
      <p className="text-sm font-bold text-gray-500 mb-4">AUCTION WINNERS</p>
      <div className="space-y-6">
        {/* Top KPI Pills */}
        <div className="flex gap-3 flex-wrap">
          <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-orange-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-blue-600" />
            <span>Total closed: {total}</span>
          </div>
          <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-blue-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <span>Forward: {forwardCount}</span>
          </div>
          <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-green-100 flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-gray-600" />
            <span>Reverse: {reverseCount}</span>
          </div>
          <div className="px-3 py-1 rounded-full text-xs text-blue-800 bg-yellow-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-600" />
            <span>Unique winners: {uniqueWinners}</span>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-4">
          {/* Left: Trend Chart */}
          <Card className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
            <CardContent className="p-0">
              <div className="p-4 flex items-center gap-2 border-blue-200">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Forward & Reverse winners trend
                </h3>
              </div>

              <div className="h-[400px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    data={winnersOverTime}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="forwardCount"
                      stroke="#2563EB"
                      strokeWidth={1}
                      name="Forward Auctions"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reverseCount"
                      stroke="#22C55E"
                      strokeWidth={1}
                      name="Reverse Auctions"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-center gap-6 mt-3 mb-4 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>{" "}
                  Forward Auctions
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>{" "}
                  Reverse Auctions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: KPIs + Pie Chart */}
          <div className="flex flex-col gap-4">
            <Card className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:scale-[1.01]">
              <CardContent className="p-4">
                <h3 className="text-base font-bold text-gray-900 mb-4">
                  Performance metrics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">
                      Total Forward Value
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      ${totalForwardValue.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">
                      Total Reverse Value
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      ${totalReverseValue.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">
                      Average Winning Value
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      ${avgWinningValue.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">
                      Total Winners
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      {uniqueWinners.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-blue-200 shadow-sm flex-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <h4 className="text-md font-bold text-black">
                    Winners by location
                  </h4>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={winnersByLocation}
                          dataKey="value"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          onMouseEnter={(_, i) => setActivePie(i)}
                          onMouseLeave={() => setActivePie(null)}
                        >
                          {winnersByLocation.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={colors[idx % colors.length]}
                            />
                          ))}
                        </Pie>
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-blue-700 font-bold"
                          style={{ fontSize: "14px" }}
                        >
                          {uniqueWinners}
                          <tspan
                            x="50%"
                            dy="1.2em"
                            className="fill-gray-500 font-medium"
                            style={{ fontSize: "10px" }}
                          >
                            winners
                          </tspan>
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-3 w-full">
                    {winnersByLocation.map((c, idx) => (
                      <div
                        key={c.name}
                        className={`flex items-center gap-2 ${
                          activePie === idx ? "font-semibold" : ""
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: colors[idx % colors.length],
                          }}
                        />
                        <span>
                          {c.name}: {c.value}
                        </span>
                      </div>
                    ))}
                    {winnersByLocation.length === 0 && (
                      <div className="text-gray-500 col-span-2">No data</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* All Winners */}
          <Card className="bg-white rounded-xl border border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">
                    All auction winners ({filteredWinners.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-300 rounded-md pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-gray-400" />
                  </div>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="text-left">Winner</th>
                      <th className="p-2">Auction</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWinners.map((w, idx) => (
                      <tr
                        key={w.auction_id + "-" + idx}
                        className="border-b hover:bg-blue-50 transition-colors"
                      >
                        <td className="p-2 text-left">
                          <HoverProfileCard id={w.winner_id}>
                            <span className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition">
                              {w.winner_name || "-"}
                            </span>
                          </HoverProfileCard>
                        </td>
                        <td className="p-2 text-left">{w.auction_name}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              w.auction_type?.toLowerCase() === "forward"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {w.auction_type}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {w.winner_location || "-"}
                        </td>
                        <td className="p-2 text-center">
                          {w.currency} {Number(w.winning_bid).toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          {formatDateShort(w.closed_at)}
                        </td>
                      </tr>
                    ))}
                    {paginatedWinners.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-4 text-center text-gray-500"
                        >
                          No winners found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-3 text-xs text-gray-600">
                <span>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-1 rounded-md border border-gray-200 ${
                      currentPage === 1
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-blue-50"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded-md border border-gray-200 ${
                      currentPage === totalPages
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-blue-50"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Top Winners */}
          <Card className="bg-white rounded-xl border border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Unique winners ({topWinners.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="p-2 text-left">Winner</th>
                      <th>Wins</th>
                      <th className="text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWinners.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b hover:bg-blue-50"
                      >
                        <td className="p-2 text-left">
                          <HoverProfileCard id={t.id}>
                            <span className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition">
                              {t.name || "-"}
                            </span>
                          </HoverProfileCard>
                        </td>
                        <td className="p-2 text-center">{t.count}</td>
                        <td className="p-2 text-center">
                          ${Number(t.value).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {topWinners.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-4 text-center text-gray-500"
                        >
                          No winners yet
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
