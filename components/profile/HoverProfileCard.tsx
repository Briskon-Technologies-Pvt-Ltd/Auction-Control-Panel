"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
} from "recharts";
import {
  Loader2,
  Calendar,
  Tag,
  MessageSquare,
  ShoppingCart,
} from "lucide-react";

interface HoverProfileCardProps {
  id: string;
  children: React.ReactNode;
}

export default function HoverProfileCard({ id, children }: HoverProfileCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const logoBlue = "#2563EB";
  const lightBlue = "#DBEAFE";

  useEffect(() => {
    if (show && id) {
      setLoading(true);
      fetch(`/api/profile-stats?id=${id}`)
        .then((res) => res.json())
        .then((json) => setData(json.data))
        .catch((err) => console.error("HoverProfileCard error:", err))
        .finally(() => setLoading(false));
    }
  }, [show, id]);

  const handleMouseEnter = () => {
    // Just show the card — no dynamic positioning now
    setCoords({ top: window.innerHeight - 480, left: 20 }); 
    // 👆 card will appear 20px from left, and 20px above bottom (assuming 460px height)
    setShow(true);
  };
  
  const card = show ? (
    <div
    className="fixed bg-white border border-[#2563EB] rounded-lg shadow-lg w-[340px] min-h-[460px] p-4 z-[9999]"
    style={{
      bottom: "20px", // 20px from bottom
      left: "225px",   // 20px from left edge
    }}
      onMouseLeave={() => setShow(false)}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : data ? (
        <div className="text-sm text-gray-700">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            {data.profile.avatar_url ? (
              <img
                src={data.profile.avatar_url}
                alt="avatar"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                {data.profile.fname?.[0] || "?"}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {data.profile.fname} {data.profile.lname}
              </p>
              <p className="text-xs text-gray-500">{data.profile.email}</p>
              <p className="text-xs text-gray-500">{data.profile.location || "-"}</p>
            </div>
          </div>

          {/* Verification Pills */}
          <div className="flex gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                data.profile.verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              Email {data.profile.verified ? "Verified" : "Not Verified"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                data.profile.isadminapproved
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {data.profile.isadminapproved ? "Admin Approved" : "Admin Pending"}
            </span>
          </div>

          <div className="h-[1px] bg-gray-200 mb-3"></div>

          {/* KPI Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <p className="text-xs text-gray-500">Auctions</p>
              <p className="font-bold text-gray-800">{data.buyerStats.auctions}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Wins</p>
              <p className="font-bold text-gray-800">{data.buyerStats.wins}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Listings</p>
              <p className="font-bold text-gray-800">{data.sellerStats.listings}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Bid</p>
              <p className="font-bold text-gray-800">${data.buyerStats.avgBid}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">High Bid</p>
              <p className="font-bold text-gray-800">${data.buyerStats.highBid}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">GMV</p>
              <p className="font-bold text-gray-800">${data.sellerStats.gmvSold}</p>
            </div>
          </div>

          {/* Engagement */}
                   
            <p className="text-xs text-gray-500 mb-1">Engagement</p>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 bg-[#2563EB]"
                style={{
                  width: `${
                    data.totalAuctions > 0
                      ? Math.round((data.buyerStats.auctions / data.totalAuctions) * 100)
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {data.buyerStats.auctions} engagements out of {data.totalAuctions} auctions
            </p>

          {/* Win Rate Donut */}
          <div className="mt-3">
            <p className="text-xs text-gray-500">Win Rate</p>
            <div className="flex justify-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Wins", value: data.buyerStats.winRate },
                      { name: "Other", value: 100 - data.buyerStats.winRate },
                    ]}
                    dataKey="value"
                    innerRadius={35}
                    outerRadius={50}
                    paddingAngle={2}
                  >
                    <Cell fill={logoBlue} />
                    <Cell fill={lightBlue} />
                  </Pie>
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-bold fill-gray-800"
                  >
                    {data.buyerStats.winRate}%
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: logoBlue }}></span>
                Wins
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lightBlue }}></span>
                Other
              </div>
            </div>
          </div>

                
          {/* Footer */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 mt-3 border-t pt-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <Tag className="w-3 h-3 text-[#2563EB]" />
                Buying Categories
              </div>
              <p className="font-bold text-gray-800">
                {data.buyerStats.categories.length > 0
                  ? data.buyerStats.categories.join(", ")
                  : "—"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <ShoppingCart className="w-3 h-3 text-[#2563EB]" />
                Selling Categories
              </div>
              <p className="font-bold text-gray-800">
                {data.sellerStats.categories.length > 0
                  ? data.sellerStats.categories.join(", ")
                  : "—"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <MessageSquare className="w-3 h-3 text-[#2563EB]" />
                Messages Exchanged
              </div>
              <p className="font-bold text-gray-800">{data.buyerStats.messages}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <Calendar className="w-3 h-3 text-[#2563EB]" />
                Member Since
              </div>
              <p className="font-bold text-gray-800">{data.combined.memberSince}</p>
            </div>
          </div>

        </div>
      ) : (
        <p className="text-xs text-gray-500">No data found</p>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      className="inline-block"
    >
      {children}
      {typeof window !== "undefined" ? createPortal(card, document.body) : null}
    </div>
  );
}
