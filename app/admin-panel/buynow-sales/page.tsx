"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, BarChart3, Clock } from "lucide-react";
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
export default function BuyNowPurchasesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [bidders, setBidders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


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
            fetch("/api/bidders").catch(() => null),  // <-- new call
          ]);

        if (rs) {
          const js = await rs.json().catch(() => null);
          setSellers(js?.success ? js.data.profiles || [] : []);
        } else setSellers([]);

        if (ra) {
          const ja = await ra.json().catch(() => null);
          setAuctions(ja?.success ? ja.data.auctions || [] : []);
        } else setAuctions([]);

        if (rb) {
            const jb = await rb.json().catch(() => null);
            setBidders(jb?.success ? jb.data.profiles || [] : []);
          } else setBidders([]);

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
  // Only SOLD BuyNow products
  const purchases = auctions.filter(
    (a) =>
      a.sale_type === 2 &&
      a.approved === true &&
      a.purchaser &&
      String(a.purchaser).trim() !== ""
  );

  // KPIs
  const totalPurchases = purchases.length;
  const GMV = purchases.reduce((sum, a) => sum + Number(a.buy_now_price || 0), 0);
  const avgValue = totalPurchases ? Math.round(GMV / totalPurchases) : 0;
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
  purchases.forEach((a) => {
    const cat = a.categoryid || "Uncategorized";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap).map(([name, count]) => ({
    name,
    value: count,
  }));

  // Purchases over time
  const monthlyMap: Record<string, { count: number; date: Date }> = {};
  purchases.forEach((a) => {
    if (!a.createdat) return;
    const d = new Date(a.createdat);
    if (isNaN(d.getTime())) return;
    const key = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { count: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
    }
    monthlyMap[key].count++;
  });
  const purchasesOverTime = Object.entries(monthlyMap)
    .map(([month, val]) => ({ month, ...val }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Map seller profiles
  const profilesMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of sellers) {
      if (p?.id !== undefined && p?.id !== null) m.set(String(p.id), p);
    }
    return m;
  }, [sellers]);
// Map Buyers profiles
  const biddersMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of bidders) {
      if (b?.id !== undefined && b?.id !== null) m.set(String(b.id), b);
    }
    return m;
  }, [bidders]);

  if (!user || user.role !== "admin") return null;

  const colors = ["#F97316", "#FBBF24", "#FACC15", "#FDE68A", "#FEF3C7"];

  /* ----------------- UI ----------------- */
  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Status Summary */}
        <div className="bg-gradient-to-r from-orange-50 via-yellow-50 to-yellow-100 shadow-md rounded-xl p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Buy Now Purchases</h2>
            <p className="text-xs text-black">Overview of completed Buy Now product purchases</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#F9731620", color: "black" }}>
              Total Purchases: {totalPurchases}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#FBBF2420", color: "black" }}>
              GMV: ${GMV.toLocaleString()}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#FACC1520", color: "black" }}>
              Avg Value: ${avgValue.toLocaleString()}
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-bold shadow"
              style={{ backgroundColor: "#FDE68A20", color: "black" }}>
              Commission: ${commission.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Category Pie */}
          <Card>
            <CardContent className="p-3">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-300 pb-1">
                <ShoppingCart className="w-5 h-5 text-orange-500" /> Purchases by Category
              </h3>
              <div className="flex flex-col items-center">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        outerRadius={80}
                        label={false}
                      >
                        {categoryData.map((_, idx) => (
                          <Cell key={idx} fill={colors[idx % colors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 w-full">
                  {categoryData.map((cat, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      ></span>
                      {cat.name}: {cat.value}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchases Over Time */}
          <Card>
            <CardContent className="p-3">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-300 pb-1">
                <Clock className="w-5 h-5 text-orange-500" /> Purchases Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={purchasesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Purchases Table */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-300 pb-2">
              <BarChart3 className="w-5 h-5 text-orange-500" /> All Purchases
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="p-2 text-left">Product Name</th>
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
                    let sellerName = "-";
                    if (a?.seller) {
                      const p = profilesMap.get(String(a.seller));
                      if (p) sellerName = `${p.fname || ""} ${p.lname || ""}`.trim();
                    }

                    return (
                      <tr key={a.id ?? idx} className="border-b hover:bg-yellow-50">
                        <td className="p-2">{a.productname}</td>
                        <td className="p-2 text-center">{a.categoryid || "-"}</td>
                        <td className="p-2 text-center">{sellerName}</td>
                        <td className="p-2 text-center">
                                {(() => {
                                    let purchaserName = "-";
                                    if (a?.purchaser) {
                                    const b = biddersMap.get(String(a.purchaser));
                                    if (b) purchaserName = `${b.fname || ""} ${b.lname || ""}`.trim();
                                    }
                                    return purchaserName;
                                })()}
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
                        No Buy Now purchases yet
                      </td>
                    </tr>
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
