"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Clock,
  Trophy,
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
export default function BuyNowDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // for pie hover

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [rs, ra] = await Promise.all([
          fetch("/api/sellers").catch(() => null),
          fetch("/api/auctions").catch(() => null),
        ]);

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
        setSellers([]);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, router]);

  /* ----------------- Derived Data ----------------- */
  const buyNowList = auctions.filter((a) => a.sale_type === 2);

  // Approved / Pending
  const approved = buyNowList.filter((a) => a.approved === true);
  const pending = buyNowList.filter((a) => a.approved === false);

  // Status counts
  const total = buyNowList.length;
  const sold = approved.filter((a) => a.purchaser && String(a.purchaser).trim() !== "").length;

  const active = approved.filter((a) => !a.purchaser || String(a.purchaser).trim() === "").length;

  const unsold = approved.length - sold;

  // GMV (sum of sold items)
  const currencyMap: Record<string, number> = {};
  approved.forEach((a) => {
    const curr = a?.currency || "USD";
    const price = Number(a?.buy_now_price || 0);
    if (!currencyMap[curr]) currencyMap[curr] = 0;
    if (a.bidcount === 1) currencyMap[curr] += price;
  });

  const GMV = Object.values(currencyMap).reduce((s, v) => s + v, 0);
  const avgValue = approved.length ? Math.round(GMV / approved.length) : 0;
  const commission = Math.round(GMV * 0.05);

  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    INR: "₹",
    CAD: "CA$",
    GBP: "£",
    AUD: "A$",
  };

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

  // Monthly listings
  const monthlyMap: Record<string, { count: number; date: Date }> = {};
  buyNowList.forEach((a) => {
    if (!a.createdat) return;
    const d = new Date(a.createdat);
    if (isNaN(d.getTime())) return;
    const key = `${d.toLocaleString("default", {
      month: "short",
    })} ${d.getFullYear()}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { count: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
    }
    monthlyMap[key].count++;
  });
  const listingsOverTime = Object.entries(monthlyMap)
    .map(([month, val]) => ({ month, ...val }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // profiles map
  const profilesMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of sellers) {
      if (p?.id !== undefined && p?.id !== null) m.set(String(p.id), p);
    }
    return m;
  }, [sellers]);

  if (!user || user.role !== "admin") return null;

  const colors = ["#DC2626", "#F59E0B", "#2563EB", "#16A34A", "#9333EA"];

  /* ----------------- UI ----------------- */
  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Status Summary */}
        <div className="bg-gradient-to-r from-white via-orange-100 to-orange-50 shadow-md rounded-xl p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Buy Now Dashboard</h2>
            <p className="text-xs text-black">Business performance overview for Buy Now products</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "teal", color: "white" }}>
              Total: {total}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#16A34A20", color: "#16A34A" }}>
              Active: {active}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#F59E0B20", color: "red" }}>
              Approval Pending: {pending.length}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#2563EB20", color: "#2563EB" }}>
              Sold: {sold}
            </div> 
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          {/* Category Pie with Hover */}
          <div className="md:col-span-3">
            <Card>
              <CardContent className="p-3">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-300 pb-1">
                  <ShoppingCart className="w-5 h-5 text-orange-600" /> Category Distribution
                </h3>

                <div className="flex flex-col items-center">
                  <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryPerformance}
                          dataKey="count"
                          innerRadius={30}
                          outerRadius={80}
                          paddingAngle={5}
                          label={false}
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

                  {/* Custom Legend */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 w-full">
                    {categoryPerformance.map((cat, idx) => (
                      <span
                        key={idx}
                        className={`flex items-center gap-1 transition-transform ${
                          activeIndex === idx ? "scale-110 font-semibold" : ""
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

          {/* Listings Over Time */}
          <div className="md:col-span-7">
          <Card>
  <CardContent className="p-4">
    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-300 pb-1">
      <Clock className="w-5 h-5 text-orange-600" /> Monthly Listing Trend
    </h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={listingsOverTime}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#6B7280" }} // smaller, gray ticks
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6B7280" }} // smaller, gray ticks
        />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>

          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="font-bold text-gray-700 mb-1">Buy Now GMV</p>
              <div className="text-3xl font-bold text-orange-600 text-center">
                ${Number(GMV || 0).toLocaleString()}
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="text-xs text-gray-600 space-y-1">
                {Object.entries(currencyMap).map(([curr, val]) => (
                  <div key={curr} className="flex justify-between">
                    <span>{currencySymbols[curr] ?? curr}</span>
                    <span className="font-semibold">{Number(val).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-semibold text-gray-700 mb-1 border-b border-gray-300 pb-1">Avg Buy Now Value</p>
              <span className="text-3xl font-bold text-orange-600">
                ${Number(avgValue || 0).toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-semibold text-gray-700 mb-1 border-b border-gray-300 pb-1">Commission (5%)</p>
              <span className="text-3xl font-bold text-orange-600">
                ${Number(commission || 0).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Approval Requests */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <h3 className=" text-xl font-semibold text-gray-800">
                Approval Requests : New Buy Now Products ({pending.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="p-2 text-left">Product Name</th>
                    <th>Created By</th>
                    <th>Price</th>
                    <th>Currency</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((a, idx) => {
                    let creatorName = "-";
                    if (a?.seller) {
                      const p = profilesMap.get(String(a.seller));
                      if (p) creatorName = `${p.fname || ""} ${p.lname || ""}`.trim();
                    }
                    return (
                      <tr key={a.id ?? idx} className="border-b hover:bg-gray-50">
                        <td className="p-2">{a.productname || "-"}</td>
                        <td className="p-2 text-center">{creatorName}</td>
                        <td className="p-2 text-center">{a.buy_now_price}</td>
                        <td className="p-2 text-center">{a.currency}</td>
                        <td className="p-2 text-center">
                          <Button size="sm" className="bg-green-100 text-green-700 text-xs mr-1">Approve</Button>
                          <Button size="sm" className="bg-red-100 text-red-700 text-xs">Reject</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {pending.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        No Buy Now products pending approval
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent BuyNow */}
        <Card>
  <CardContent className="p-4">
    <div className="flex items-center gap-2 mb-3">
      <Trophy className="w-5 h-5 text-yellow-500" />
      <h3 className="text-xl font-semibold text-gray-800">Recent Approved Buy Now Products</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {[...approved]
        .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
        .slice(0, 10) // show 10 products
        .map((a, idx) => {
          let sellerName = "-";
          if (a?.seller) {
            const p = profilesMap.get(String(a.seller));
            if (p) sellerName = `${p.fname || ""} ${p.lname || ""}`.trim();
          }

          return (
            <div key={idx} className="flex items-start gap-2 border-b border-gray-200 pb-2">
              {/* Bullet */}
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1"></span>

              {/* Product + seller + price */}
              <div className="flex flex-col">
                <span className="font-medium text-gray-800 text-sm">{a.productname} &nbsp;
                <span className="text-xs text-gray-500">(<i>Seller: {sellerName}</i>)</span> </span>
                <span className="text-sm font-semibold text-gray-700">
                  {a.buy_now_price} {a.currency}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  </CardContent>
</Card>


      </div>
    </AdminLayout>
  );
}
