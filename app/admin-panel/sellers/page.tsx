"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  Store,
  TrendingUp,
  DollarSign,
  BarChart3,
  Search,
  Medal,
  Trophy,
} from "lucide-react";
import HoverProfileCard from "@/components/profile/HoverProfileCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

/* ----------------- Utilities ----------------- */
function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear().toString().slice(-2);
  return `${day} ${month}’${year}`;
}
function shortLabel(dateKey: string) {
  const d = new Date(dateKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}
function dayKeyFromDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* KPI Pill */
const Pill = ({ label, value, color }: any) => (
  <div
    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${color} border-transparent shadow-sm mr-2`}
  >
    <span className="text-xs text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-gray-800 bg-white/60 px-2 py-0.5 rounded-full">
      {value}
    </span>
  </div>
);

export default function SellersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [sellers, setSellers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [sellersRes, auctionsRes, bidsRes] = await Promise.all([
          fetch("/api/sellers"),
          fetch("/api/auctions"),
          fetch("/api/bids"),
        ]);
        const s1 = await sellersRes.json();
        const s2 = await auctionsRes.json();
        const s3 = await bidsRes.json();

        setSellers(s1?.data?.profiles || s1?.profiles || []);
        setAuctions(s2?.data?.auctions || s2?.auctions || []);
        setBids(s3?.data?.bids || s3?.bids || []);
      } catch (err) {
        console.error("fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, router]);

  /* ---------- KPIs ---------- */
  const totalSellers = sellers.length;
  const pendingApproval = sellers.filter((s) => !s.verified).length;
  const verifiedRate = sellers.length
    ? Math.round((sellers.filter((s) => s.verified).length / sellers.length) * 100)
    : 0;
  const avgTenureDays = sellers.length
    ? Math.round(
        sellers.reduce((sum, s) => {
          const created = new Date(s.created_at || s.createdat);
          const diff = isNaN(created.getTime()) ? 0 : (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0) / sellers.length
      )
    : 0;

  /* ---------- daily registrations ---------- */
  const dailyRegistrations = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sellers) {
      const dt = new Date(s.created_at || s.createdat);
      if (isNaN(dt.getTime())) continue;
      const key = dayKeyFromDate(dt);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, registrations]) => ({
        date,
        label: shortLabel(date),
        registrations,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sellers]);

  /* ---------- daily auctions (only days with actual creations) ---------- */
  const dailyAuctions = useMemo(() => {
    const map = new Map<string, number>();

    for (const a of auctions) {
      const rawDate = a.createdat || a.created_at || a.scheduledstart;
      if (!rawDate) continue;

      const dt = new Date(rawDate);
      if (isNaN(dt.getTime())) continue;

      const key = dayKeyFromDate(dt);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([date, auctions]) => ({
        date,
        label: shortLabel(date),
        auctions,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [auctions]);

  /* ---------- performance metrics (based on closed auctions + highest bids) ---------- */
  const now = new Date();

  // helper to calculate auction end time
  function computeAuctionEnd(a: any) {
    try {
      const startRaw = a.scheduledstart || a.createdat || a.created_at;
      const start = new Date(startRaw);
      if (isNaN(start.getTime())) return null;

      const dur = a.auctionduration || {};
      const end = new Date(start);
      if (dur.days) end.setDate(end.getDate() + Number(dur.days));
      if (dur.hours) end.setHours(end.getHours() + Number(dur.hours));
      if (dur.minutes) end.setMinutes(end.getMinutes() + Number(dur.minutes));
      return end;
    } catch {
      return null;
    }
  }

  // only approved auctions
  const approvedAuctions = auctions.filter((a) => a.approved === true);
  const totalAuctions = approvedAuctions.length;

  // active auctions = approved + end time > now
  const activeAuctions = approvedAuctions.filter((a) => {
    const end = computeAuctionEnd(a);
    return end && end > now;
  }).length;

  // closed auctions = approved + end time < now
  const closedAuctions = approvedAuctions.filter((a) => {
    const end = computeAuctionEnd(a);
    return end && end < now;
  });

  // Map auctionId → highest bid value
  const highestBidMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bids) {
      const auctionId = b.auction_id || b.auctionid;
      if (!auctionId) continue;
      const current = map.get(auctionId) || 0;
      const bidValue = Number(b.amount || b.bidamount || 0);
      if (bidValue > current) map.set(auctionId, bidValue);
    }
    return map;
  }, [bids]);

  // successful auctions = closed + at least one bid
  const successfulAuctions = closedAuctions.filter((a) =>
    highestBidMap.has(a.id)
  );

  const successRate = totalAuctions
    ? Math.round((successfulAuctions.length / totalAuctions) * 100)
    : 0;

  const totalRevenue = successfulAuctions.reduce((sum, a) => {
    const val = Number(highestBidMap.get(a.id) || 0);
    return sum + val;
  }, 0);

  const avgAuctionValue =
    successfulAuctions.length > 0
      ? Math.round(totalRevenue / successfulAuctions.length)
      : 0;
 
 
/* ---------- top 5 sellers (by number of auctions created) ---------- */
const top5Sellers = useMemo(() => {
  if (!auctions?.length || !sellers?.length) return [];

  // Step 1: Count how many auctions each seller has created
  const counts = new Map<string, number>();
  for (const a of auctions) {
    const sellerId = a.seller; // correct mapping
    if (!sellerId) continue;
    counts.set(sellerId, (counts.get(sellerId) || 0) + 1);
  }

  // Step 2: Join seller details from profiles
  const combined = Array.from(counts.entries()).map(([sellerId, total]) => {
    const seller = sellers.find((s) => s.id === sellerId);
    const name = seller
      ? `${seller.fname || ""} ${seller.lname || ""}`.trim()
      : sellerId.slice(0, 8); // fallback to part of UUID if not found
    return { id: sellerId, name, total };
  });

  // Step 3: Sort by number of auctions (descending)
  return combined.sort((a, b) => b.total - a.total).slice(0, 5);
}, [auctions, sellers]);



  /* ---------- Table ---------- */
  const filteredSellers = sellers.filter((s) =>
    [s.fname, s.lname, s.email, s.phone, s.location]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredSellers.length / rowsPerPage));
  const paginatedSellers = filteredSellers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const exportCSV = () => {
    const headers = ["Full Name", "Email", "Location", "Phone", "Joining Date", "Verified"];
    const rows = sellers.map((s) => [
      `${s.fname} ${s.lname}`,
      s.email,
      s.location || "",
      s.phone || "",
      formatDate(s.created_at || s.createdat),
      s.verified ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sellers.csv";
    a.click();
  };

  const exportExcel = () => {
    let html =
      "<table><tr><th>Full Name</th><th>Email</th><th>Location</th><th>Phone</th><th>Joining Date</th><th>Verified</th></tr>";
    sellers.forEach((s) => {
      html += `<tr><td>${s.fname} ${s.lname}</td><td>${s.email}</td><td>${
        s.location || ""
      }</td><td>${s.phone || ""}</td><td>${formatDate(
        s.created_at || s.createdat
      )}</td><td>${s.verified ? "Yes" : "No"}</td></tr>`;
    });
    html += "</table>";
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sellers.xls";
    a.click();
  };
  const handleAction = (id: string, action: string) => {
    alert(`${action} action triggered for user ID: ${id}`);
  };
  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-gray-600">Loading sellers & auctions...</div>
      </AdminLayout>
    );
  }

  /* ----------------- Render ----------------- */
  return (
    <AdminLayout>
      <p className="text-sm font-bold text-gray-500 mb-4"> SUPPLIERS / SELLERS</p> 
      <div className="space-y-6">
        {/* KPI Pills */}
        <div className="flex flex-wrap gap-2">
          <Pill label="Total sellers" value={totalSellers} color="bg-blue-50" />
          <Pill label="Approval pending" value={pendingApproval} color="bg-pink-50" />
          <Pill label="Verification rate" value={`${verifiedRate}%`} color="bg-green-50" />
          <Pill label="Avg seller tenure" value={`${avgTenureDays} days`} color="bg-yellow-50" />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Registrations */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-56 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-full">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-md font-bold text-black">Seller registrations trend</h4>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis width={40} fontSize={11}/>
                  <Tooltip />
                  <Line type="monotone" dataKey="registrations" stroke="#2563eb" strokeWidth={1} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance metrics */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-56 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-md font-bold text-black text-center flex-1">Performance metrics</h4>
              <span className="text-xs text-gray-500 whitespace-nowrap">Key parameters</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Total auctions</span>
                <span className="font-semibold">{totalAuctions}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Active auctions</span>
                <span className="font-semibold">{activeAuctions}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Successful auctions</span>
                <span className="font-semibold">{successfulAuctions.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Success rate</span>
                <span className="font-semibold">{successRate}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Avg auction value</span>
                <span className="font-semibold">${Number(avgAuctionValue || 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Total revenue</span>
                <span className="font-semibold">${Math.round(Number(totalRevenue || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Auctions trend */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-60 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="text-md font-bold text-black">Auction listing trend</h4>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyAuctions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis width={40} fontSize={11}/>
                  <Tooltip />
                  <Line type="monotone" dataKey="auctions" stroke="#16a34a" strokeWidth={1} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 sellers */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-60 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-400 rounded-full">
                <Medal className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-md font-bold text-black">Top 5 sellers</h4>
              <div className="text-xs text-gray-900">by auctions count </div>
            </div>

            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5Sellers.map((t, i) => ({
                    name: t.name,
                    total: Math.round(t.total),
                    fillId: `colorGradient${i}`,
                  }))}
                  margin={{ top: 6, right: 6, left: -6, bottom: 42 }}
                >
                  <defs>
                    {top5Sellers.map((_, i) => {
                      const colors = ["#1e3a8a", "#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"];
                      const c = colors[i % colors.length];
                      return (
                        <linearGradient key={i} id={`colorGradient${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.4} />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 11, angle: -25, textAnchor: "end" }} />
                  <YAxis tickFormatter={(val) => val.toLocaleString()} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => `${Number(val)} auctions`} />

                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {top5Sellers.map((_, i) => (
                      <Cell key={i} fill={`url(#colorGradient${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div>
          {/* Header: Icon + Title + Search + Export */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-md font-semibold text-gray-800">Registered suppliers/sellers</h4>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center border border-gray-300 rounded-md bg-white px-2 h-8 w-64">
                <Search className="w-4 h-4 text-gray-400 mr-1" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent outline-none text-gray-900 text-[12px] w-full placeholder-gray-400"
                />
              </div>
              <div className="flex items-center space-x-1 text-[12px]">
                <span className="font-semibold text-gray-700 mr-1">Export:</span>
                <button
                  onClick={exportCSV}
                  className="h-8 px-3 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition"
                >
                  CSV
                </button>
                <button
                  onClick={exportExcel}
                  className="h-8 px-3 rounded-md bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow border border-blue-200">
            <table className="w-full border-collapse">
              <thead className="bg-sky-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Seller name / contact</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Joining Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Verified</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSellers.map((s, idx) => (
                  <tr key={s.id || idx} className={`${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      <HoverProfileCard id={s.id}>
                        <div>
                          <span className="text-blue-600 underline cursor-pointer font-medium">
                            {s.fname} {s.lname}
                          </span>
                        </div>
                      </HoverProfileCard>
                      <div className="italic text-gray-500 text-xs">{s.email}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">{s.phone || "-"}</td>
                    <td className="px-4 py-2 text-xs">{s.location || "-"}</td>
                    <td className="px-4 py-2 text-xs">{formatDate(s.created_at || s.createdat)}</td>
                    <td className="px-4 py-2 text-xs">{s.verified ? "Yes" : "No"}</td>
                    <td className="px-4 py-2 text-xs">
              <button
                onClick={() => handleAction(s.id, "Suspend")}
                className="px-2 py-1 text-orange-700 bg-orange-100 rounded hover:bg-orange-200 mr-1"
              >
                Suspend
              </button>
              <button
                onClick={() => handleAction(s.id, "Deactivate")}
                className="px-2 py-1 text-orange-700 bg-orange-100 rounded hover:bg-orange-200"
              >
                Deactivate
              </button>
            </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSellers.length > rowsPerPage && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
