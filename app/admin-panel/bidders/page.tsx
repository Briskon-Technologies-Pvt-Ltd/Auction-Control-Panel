"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Users, ArrowUpRight,UserPlus,Gavel,Trophy,Medal,Search } from "lucide-react";
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
function formatDate(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear().toString().slice(-2);
  return `${day}${suffix} ${month}’${year}`;
}

function shortLabel(dateKey: string) {
  const d = new Date(dateKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}
// use local dates so we don't get off-by-one UTC shifts
function dayKeyFromDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* Small pill KPI */
const Pill = ({ label, value, color }: any) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${color} border-transparent shadow-sm mr-2`}>
    <span className="text-xs text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-gray-800 bg-white/60 px-2 py-0.5 rounded-full">
      {value}
    </span>
  </div>
);

export default function BuyersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [buyers, setBuyers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // table
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
        const [biddersRes, bidsRes, auctionsRes] = await Promise.all([
          fetch("/api/bidders"),
          fetch("/api/bids"),
          fetch("/api/auctions"),
        ]);
        const b1 = await biddersRes.json();
        const b2 = await bidsRes.json();
        const b3 = await auctionsRes.json();

        // set shapes defensively
        setBuyers(b1?.data?.profiles || b1?.profiles || []);
        setBids(b2?.data?.bids || b2?.bids || []);
        setAuctions(b3?.data?.auctions || b3?.auctions || []);
      } catch (err) {
        console.error("fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, router]);

  /* ---------- KPIs ---------- */
  const totalBuyers = buyers.length;
  const pendingApproval = buyers.filter((b) => !b.verified).length;
  const verifiedRate = buyers.length ? Math.round((buyers.filter((b) => b.verified).length / buyers.length) * 100) : 0;
  const avgTenureDays = buyers.length
    ? Math.round(
        buyers.reduce((sum, b) => {
          const created = new Date(b.created_at);
          const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0) / buyers.length
      )
    : 0;

  /* ---------- dynamic daily range (60 days default, extend to earliest data up to 180 days cap) ---------- */
  const days = useMemo(() => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = new Date();

    // defaultStart = 60 days ago
    const defaultStart = new Date(now.getTime() - 60 * MS_PER_DAY);

    // collect candidate timestamps from buyers & bids
    const candidateDates: number[] = [];

    buyers.forEach((b) => {
      if (b?.created_at) {
        const d = new Date(b.created_at);
        if (!isNaN(d.getTime())) candidateDates.push(d.getTime());
      }
    });
    bids.forEach((b) => {
      const c = b?.created_at ?? b?.createdAt ?? b?.timestamp ?? null;
      if (c != null) {
        let dt: Date;
        if (typeof c === "number") {
          dt = c < 1e12 ? new Date(c * 1000) : new Date(c);
        } else {
          dt = new Date(String(c));
        }
        if (!isNaN(dt.getTime())) candidateDates.push(dt.getTime());
      }
    });

    const minCandidate = candidateDates.length ? Math.min(...candidateDates) : null;
    const startDate = minCandidate ? new Date(Math.min(minCandidate, defaultStart.getTime())) : defaultStart;

    // cap: not more than 180 days back
    const maxBack = new Date(now.getTime() - 180 * MS_PER_DAY);
    const finalStart = startDate < maxBack ? maxBack : startDate;

    // build day array UTC-normalized
    const arr: string[] = [];
    const cursor = new Date(Date.UTC(finalStart.getUTCFullYear(), finalStart.getUTCMonth(), finalStart.getUTCDate()));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    while (cursor <= end) {
      const yyyy = cursor.getUTCFullYear();
      const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getUTCDate()).padStart(2, "0");
      arr.push(`${yyyy}-${mm}-${dd}`);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return arr;
  }, [buyers, bids]);

/* ---------- daily registrations (only days with actual signups) ---------- */
const dailyRegistrations = useMemo(() => {
  const map = new Map<string, number>();

  for (const b of buyers) {
    if (!b?.created_at) continue;
    const dt = new Date(b.created_at);
    if (isNaN(dt.getTime())) continue;

    const key = dayKeyFromDate(dt);
    map.set(key, (map.get(key) || 0) + 1);
  }

  const arr = Array.from(map.entries())
    .map(([date, registrations]) => ({
      date,
      label: shortLabel(date),
      registrations,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return arr;
}, [buyers]);

/* ---------- daily bids (only days with actual bids) ---------- */
const dailyBids = useMemo(() => {
  // Map: date (YYYY-MM-DD) → bid count
  const map = new Map<string, number>();

  for (const b of bids) {
    if (!b?.created_at) continue;
    const dt = new Date(b.created_at);
    if (isNaN(dt.getTime())) continue;

    // local date key (no UTC confusion)
    const key = dayKeyFromDate(dt);

    map.set(key, (map.get(key) || 0) + 1);
    // 👇 If you prefer total bid value instead of count:
    // map.set(key, (map.get(key) || 0) + (b.amount || 0));
  }

  // Convert map to array and sort chronologically
  const arr = Array.from(map.entries())
    .map(([date, bids]) => ({
      date,
      label: shortLabel(date), // e.g., "Sep 02"
      bids,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return arr;
}, [bids]);


  /* ---------- bidding metrics ---------- */
  const totalBids = bids.length;
  const totalBidValue = bids.reduce((s, b) => s + (b.amount || 0), 0);
  const uniqueBidderSet = useMemo(() => {
    const s = new Set<string>();
    bids.forEach((b) => b.user_id && s.add(b.user_id));
    return s;
  }, [bids]);
  const uniqueBidderCount = uniqueBidderSet.size;
  const avgBidsPerBidder = uniqueBidderCount ? +(totalBids / uniqueBidderCount).toFixed(2) : 0;

  const repeatBidRate = useMemo(() => {
    if (!bids.length) return 0;
    const perUser = new Map<string, Set<string>>();
    bids.forEach((b) => {
      if (!b.user_id) return;
      if (!perUser.has(b.user_id)) perUser.set(b.user_id, new Set());
      perUser.get(b.user_id)!.add(b.auction_id);
    });
    let repeats = 0;
    perUser.forEach((s) => s.size > 1 && repeats++);
    return uniqueBidderCount ? Math.round((repeats / uniqueBidderCount) * 100) : 0;
  }, [bids, uniqueBidderCount]);

  const bidSuccessRate = useMemo(() => {
    const winners = new Set<string>();
    auctions.forEach((a) => { if (a?.winner_id) winners.add(a.winner_id); });
    if (winners.size && uniqueBidderCount) return Math.round((winners.size / uniqueBidderCount) * 100);
    return 18; // dummy fallback
  }, [auctions, uniqueBidderCount]);

  /* ---------- top 5 bidders (x-axis names) ---------- */
  const top5Bidders = useMemo(() => {
    const sums = new Map<string, number>();
    bids.forEach((b) => {
      if (!b.user_id) return;
      sums.set(b.user_id, (sums.get(b.user_id) || 0) + (b.amount || 0));
    });
    const arr = Array.from(sums.entries())
      .map(([id, total]) => {
        const buyer = buyers.find((x) => x.id === id);
        return { id, name: buyer ? `${buyer.fname} ${buyer.lname}` : id.slice(0, 8), total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    return arr;
  }, [bids, buyers]);

  /* ---------- Table (search/pagination) ---------- */
  const filteredBuyers = buyers.filter((b) =>
    [b.fname, b.lname, b.email, b.phone, b.location].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredBuyers.length / rowsPerPage));
  const paginatedBuyers = filteredBuyers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  /* ---------- Export helpers ---------- */
  const exportCSV = () => {
    const headers = ["Full Name", "Email", "Location", "Phone", "Joining Date", "Verified"];
    const rows = buyers.map((b) => [
      `${b.fname} ${b.lname}`,
      b.email,
      b.location || "",
      b.phone || "",
      formatDate(b.created_at),
      b.verified ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buyers.csv";
    a.click();
  };

  const exportExcel = () => {
    let html = "<table><tr><th>Full Name</th><th>Email</th><th>Location</th><th>Phone</th><th>Joining Date</th><th>Verified</th></tr>";
    buyers.forEach((b) => {
      html += `<tr><td>${b.fname} ${b.lname}</td><td>${b.email}</td><td>${b.location || ""}</td><td>${b.phone || ""}</td><td>${formatDate(b.created_at)}</td><td>${b.verified ? "Yes":"No"}</td></tr>`;
    });
    html += "</table>";
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buyers.xls";
    a.click();
  };

  const handleAction = (id: string, action: string) => {
    alert(`${action} action triggered for user ID: ${id}`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-gray-600">Loading buyers & bids...</div>
      </AdminLayout>
    );
  }

  /* ----------------- Render ----------------- */
  return (
    <AdminLayout>
         <p className="text-sm font-bold text-gray-500 mb-4"> BIDDERS / BUYERS</p>
      <div className="space-y-6">
        {/* KPI Pills */}
        <div className="flex flex-wrap gap-2">
          <Pill label="Total bidders" value={totalBuyers} color="bg-blue-50" />
          <Pill label="Approval pending" value={pendingApproval} color="bg-pink-50" />
          <Pill label="Verification rate" value={`${verifiedRate}%`} color="bg-green-50" />
          <Pill label="Avg bidder tenure" value={`${avgTenureDays} days`} color="bg-yellow-50" />
        </div>

        {/* 2x2 Grid (left=70%, right=30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Registrations top-left (col-span 7) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-56 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-full"><UserPlus className="w-5 h-5 text-blue-600" /></div>
              <h4 className="text-md font-bold text-black">Bidders/buyers registration trend</h4>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRegistrations} margin={{ top: 6, right: 12, left: -8, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis width={40} fontSize={11}/>
                  <Tooltip />
                  <Line type="monotone" dataKey="registrations" stroke="#2563eb" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance metrics top-right (col-span 3) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-56 flex flex-col">
          {/* Header row */}
  <div className="flex items-center justify-between mb-3">
    {/* Left: circular icon */}
    <div className="p-2 bg-blue-50 rounded-full flex items-center justify-center">
      <Trophy className="w-5 h-5 text-blue-600" />
    </div>

    {/* Center: heading */}
    <h4 className="text-md font-bold text-black text-center flex-1">
      Performance metrics
    </h4>

    {/* Right: small text */}
    <span className="text-xs text-gray-500 whitespace-nowrap">
      Key parameters
    </span>
  </div>

  {/* Metrics grid */}
  <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Total verified bidders</span>
      <span className="font-semibold">{buyers.filter(b => b.verified).length}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Average bids / bidder</span>
      <span className="font-semibold">{avgBidsPerBidder}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Repeat bid rate</span>
      <span className="font-semibold">{repeatBidRate}%</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Bid success rate</span>
      <span className="font-semibold">{bidSuccessRate}%</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Total bids</span>
      <span className="font-semibold">{totalBids}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">Total bid value</span>
              <span className="font-semibold">${Math.round(totalBidValue).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bidding bottom-left (col-span 7) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-60 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-full"><Gavel className="w-5 h-5 text-green-600" /></div>
              <h4 className="text-md font-bold text-black">Biding trend</h4>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyBids} margin={{ top: 6, right: 12, left: -8, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                 <YAxis width={40} fontSize={11}/>
                  <Tooltip />
                  <Line type="monotone" dataKey="bids" stroke="#16a34a" strokeWidth={1.5} dot={{ r: 2 }} fill="#16a34a" fillOpacity={0.06} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 bidders bottom-right (col-span 3) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-blue-200 p-3 shadow-sm h-60 flex flex-col">
            <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-400 rounded-full"><Medal className="w-4 h-4 text-white" /></div>
              <h4 className="text-md font-bold text-black">Top 5 bidders</h4>
              <div className="text-xs text-gray-900">by bid value</div>
            </div>
            <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={top5Bidders.map((t, i) => ({
      name: t.name,
      total: Math.round(t.total),
      fillId: `colorGradient${i}`,
    }))}
    margin={{ top: 6, right: 6, left: -6, bottom: 42 }}
  >
    {/* ✅ Gradients for each bar */}
    <defs>
      {top5Bidders.map((_, i) => {
        const colors = ["#1e3a8a", "#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"];
        const c = colors[i % colors.length];
        return (
          <linearGradient
            key={i}
            id={`colorGradient${i}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={c} stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.4} />
          </linearGradient>
        );
      })}
    </defs>

    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
    <XAxis
      dataKey="name"
      interval={0}
      tick={{ fontSize: 11, angle: -25, textAnchor: "end" }}
    />
    <YAxis
      tickFormatter={(val) => val.toLocaleString()}
      tick={{ fontSize: 11 }}
    />
    <Tooltip formatter={(val) => `$${Number(val).toLocaleString()}`} />

    {/* ✅ Apply gradient fills dynamically */}
    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
      {top5Bidders.map((_, i) => (
        <Cell key={i} fill={`url(#colorGradient${i})`} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>

            </div>
          </div>
        </div>

           {/* Table section */}
          <div>
 
{/* Header row: Icon + Heading + Search + Export */}
<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
   {/* Left: Icon + Heading */}
  <div className="flex items-center gap-2">
    <div className="p-2 bg-blue-50 rounded-full flex items-center justify-center">
      <Users className="w-5 h-5 text-blue-600" />
    </div>
    <h4 className="text-md font-semibold text-gray-800">Registered bidders/buyers</h4>
  </div>

  {/* Right: Search + Export group */}
  <div className="flex items-center space-x-2">
    {/* Search bar */}
    <div className="flex items-center border border-gray-300 rounded-md bg-white px-2 h-8 w-64">
      <Search className="w-4 h-4 text-gray-400 mr-1" />
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
        className="bg-transparent outline-none text-gray-900 text-[12px] w-full placeholder-gray-400"
      />
    </div>

    {/* Export options */}
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
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Buyer name / contact</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Phone</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Joining Date</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Email verified</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Actions</th>
        </tr>
      </thead>
      <tbody>
        {paginatedBuyers.map((b, idx) => (
          <tr key={b.id || idx} className={`${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50`}>
            <td className="px-4 py-2 text-xs text-gray-700">
              <HoverProfileCard id={b.id}>
                <div>
                  <span className="text-blue-600 underline cursor-pointer font-medium">
                    {b.fname} {b.lname}
                  </span>
                </div>
              </HoverProfileCard>
              <div className="italic text-gray-500 text-xs">{b.email}</div>
              <div className="text-gray-400 text-xs">{b.location || ""}</div>
            </td>
            <td className="px-4 py-2 text-xs">{b.type || "-"}</td>
            <td className="px-4 py-2 text-xs">{b.phone || "-"}</td>
            <td className="px-4 py-2 text-xs">{formatDate(b.created_at)}</td>
            <td className="px-4 py-2 text-xs">{b.verified ? "Yes" : "No"}</td>
            <td className="px-4 py-2 text-xs">
              <button
                onClick={() => handleAction(b.id, "Suspend")}
                className="px-2 py-1 text-orange-700 bg-orange-100 rounded hover:bg-orange-200 mr-1"
              >
                Suspend
              </button>
              <button
                onClick={() => handleAction(b.id, "Deactivate")}
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
  {filteredBuyers.length > rowsPerPage && (
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
