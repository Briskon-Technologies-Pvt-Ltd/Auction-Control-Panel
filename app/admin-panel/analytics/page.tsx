"use client";

import { useEffect, useState } from "react";
import { Layers3, Gavel, Activity, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

/* ---------------- COLORS ---------------- */
const STATUS_COLORS: Record<string, string> = {
  Live: "#16A34A",
  Upcoming: "#2563EB",
  Closed: "#374151",
  Pending: "#F59E0B",
  Unknown: "#9CA3AF",
};

/* ---------------- MODAL ---------------- */
function Modal({ open, title, onClose, children }: any) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl w-[90%] max-w-4xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="hover:bg-white rounded-full p-1">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ---------------- MAIN ---------------- */
export default function AuctionAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalAuctions, setModalAuctions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auction-stats")
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => null);
  }, []);

  const handleShow = async (type?: string, subtype?: string, status?: string) => {
    setModalTitle("Loading...");
    setModalAuctions([]);
    setModalOpen(true);
  
    try {
      const res = await fetch("/api/auctions");
      const data = await res.json();
      let auctions = data?.data?.auctions || [];
  
      // ✅ Step 1: Filter to only Forward / Reverse
      auctions = auctions.filter((a: any) => a.sale_type === 1 || a.sale_type === 3);
  
      // ✅ Step 2: Apply auction type filter
      if (type) {
        auctions = auctions.filter(
          (a: any) =>
            String(a.auctiontype || "").toLowerCase() === String(type).toLowerCase()
        );
      }
  
      // ✅ Step 3: Apply subtype filter
      if (subtype) {
        auctions = auctions.filter(
          (a: any) =>
            String(a.auctionsubtype || "").toLowerCase() ===
            String(subtype).toLowerCase()
        );
      }
  
      // ✅ Step 4: Compute auction status dynamically
      const now = new Date();
      const calcEndDate = (a: any) => {
        if (!a.scheduledstart || !a.auctionduration) return null;
        const start = new Date(a.scheduledstart);
        const end = new Date(start);
        const d = a.auctionduration || {};
        if (d.days) end.setDate(end.getDate() + Number(d.days));
        if (d.hours) end.setHours(end.getHours() + Number(d.hours));
        if (d.minutes) end.setMinutes(end.getMinutes() + Number(d.minutes));
        return end;
      };
  
      const getStatus = (a: any) => {
        if (!a.approved) return "Pending";
        const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
        const end = calcEndDate(a);
        if (start && end && now >= start && now <= end) return "Live";
        if (start && start > now) return "Upcoming";
        if (end && end < now) return "Closed";
        return "Unknown";
      };
  
      if (status) {
        auctions = auctions.filter((a: any) => getStatus(a) === status);
      }
  
      // ✅ Step 5: Set modal
      setModalAuctions(auctions);
      setModalTitle(
        `${type ? type.charAt(0).toUpperCase() + type.slice(1) : "All"} ${
          subtype ? `→ ${subtype}` : ""
        } ${status ? `→ ${status}` : ""} (${auctions.length})`
      );
    } catch (err) {
      console.error("Error loading auctions:", err);
      setModalTitle("Error loading auctions");
      setModalAuctions([]);
    }
  };
  
  if (!stats)
    return (
      <AdminLayout>
        <div className="p-6 text-gray-500 text-sm">Loading analytics...</div>
      </AdminLayout>
    );

  const { summary, forward, reverse } = stats;
  const order = ["Live", "Upcoming", "Closed", "Pending"];

  /* ---------------- SUBTYPE ROW ---------------- */
  function renderSubtypeRow(type: string, label: string, subtype: any) {
    const total = subtype?.total || 0;
    if (!total) return null;

    const segments = order
      .map((k) => ({
        key: k,
        val: subtype?.status?.[k] || 0,
        color: STATUS_COLORS[k],
      }))
      .filter((s) => s.val > 0);

    const widths: number[] = [];
    if (total > 0 && segments.length > 0) {
      let sum = 0;
      for (let i = 0; i < segments.length; i++) {
        if (i === segments.length - 1) widths.push(Math.max(0, 100 - sum));
        else {
          const w = Math.round((segments[i].val / total) * 100);
          widths.push(w);
          sum += w;
        }
      }
    }

    const liveRatio =
      subtype?.status?.Live && total
        ? Math.round((subtype.status.Live / total) * 100)
        : 0;

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        key={label}
        className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 capitalize">{label}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 text-xs">
                {total}
              </span>
            </div>

            {/* Thin green progress bar showing % Live */}
            {liveRatio > 0 && (
              <div className="relative w-32 h-1 bg-gray-100 rounded-full mt-1">
                <div
                  className="absolute left-0 top-0 h-1 bg-green-500 rounded-full"
                  style={{ width: `${liveRatio}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Bar */}
        <div className="w-full bg-gray-50 rounded-full h-3 overflow-hidden mt-1">
          <div className="flex h-full">
            {segments.map((s, i) => {
              const isFirst = i === 0;
              const isLast = i === segments.length - 1;
              const style: any = {
                width: `${widths[i]}%`,
                backgroundColor: s.color,
              };
              if (isFirst) {
                style.borderTopLeftRadius = 999;
                style.borderBottomLeftRadius = 999;
              }
              if (isLast) {
                style.borderTopRightRadius = 999;
                style.borderBottomRightRadius = 999;
              }
              return <div key={s.key} style={style} className="h-full" />;
            })}
          </div>
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          {order.map((k) => {
            const count = subtype?.status?.[k] || 0;
            if (!count) return null;
            return (
              <button
                key={k}
                onClick={() => handleShow(type, label, k)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[k] }}
                />
                <span className="text-xs text-gray-700">{k}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    type === "forward"
                      ? "bg-green-50 text-green-800"
                      : type === "reverse"
                      ? "bg-red-50 text-red-800"
                      : "bg-indigo-50 text-indigo-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-2 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-4 h-4 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">
            Auction analytics
          </h2>
        </div>

        {/* ---------- Total Auctions ---------- */}
        <Card className="border border-indigo-100 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers3 className="w-4 h-54text-indigo-600" />
              <h3 className="text-sm font-semibold text-indigo-800">
                Total Auctions ({summary.total})
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(summary)
                .filter(([k]) => k !== "total" && !(k === "Unknown" && summary[k] === 0))
                .map(([key, val]: any) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-white rounded-md px-3 py-2 shadow-sm hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[key] ?? "#9CA3AF" }}
                      />
                      <div className="text-sm text-gray-700">{key}</div>
                    </div>
                    <div className="text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-xs">
                        {val}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* ---------- Forward & Reverse ---------- */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Forward */}
          <Card className="border border-green-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">
                  Forward Auctions ({forward.total})
                </h3>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(forward.status)
                  .filter(([k, v]: any) => !(k === "Unknown" && v === 0))
                  .map(([k, v]: any) => (
                    <button
                      key={k}
                      onClick={() => handleShow("forward", undefined, k)}
                      className="flex items-center justify-between text-sm text-gray-700 hover:text-green-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[k] }}
                        />
                        {k}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-800 text-xs">
                        {v}
                      </span>
                    </button>
                  ))}
              </div>

              <div className="border-t border-gray-100"></div>

              <div className="space-y-4">
                {Object.entries(forward.subtypes).map(([key, sub]: any) =>
                  renderSubtypeRow("forward", key, sub)
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reverse */}
          <Card className="border border-red-100 rounded-xl shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Reverse Auctions ({reverse.total})
                </h3>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(reverse.status)
                  .filter(([k, v]: any) => !(k === "Unknown" && v === 0))
                  .map(([k, v]: any) => (
                    <button
                      key={k}
                      onClick={() => handleShow("reverse", undefined, k)}
                      className="flex items-center justify-between text-sm text-gray-700 hover:text-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[k] }}
                        />
                        {k}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-800 text-xs">
                        {v}
                      </span>
                    </button>
                  ))}
              </div>

              <div className="border-t border-gray-100"></div>

              <div className="space-y-4">
                {Object.entries(reverse.subtypes).map(([key, sub]: any) =>
                  renderSubtypeRow("reverse", key, sub)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------- Modal ---------- */}
        <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)}>
        {modalAuctions.length === 0 ? (
  <p className="text-gray-500 text-sm">No auctions found.</p>
) : (
  <div className="grid gap-3">
    {modalAuctions.map((a: any) => {
      const now = new Date();
      const start = a.scheduledstart ? new Date(a.scheduledstart) : null;
      const end = a.auctionduration
        ? (() => {
            const e = new Date(a.scheduledstart);
            if (a.auctionduration.days) e.setDate(e.getDate() + Number(a.auctionduration.days));
            if (a.auctionduration.hours) e.setHours(e.getHours() + Number(a.auctionduration.hours));
            if (a.auctionduration.minutes) e.setMinutes(e.getMinutes() + Number(a.auctionduration.minutes));
            return e;
          })()
        : null;

      let status = "Unknown";
      if (!a.approved) status = "Pending";
      else if (start && end && now >= start && now <= end) status = "Live";
      else if (start && start > now) status = "Upcoming";
      else if (end && end < now) status = "Closed";

      return (
        <div
          key={a.id || a.auction_id}
          className="border border-gray-100 rounded-lg p-4 hover:shadow-md hover:border-blue-200 transition-all bg-white"
        >
          {/* Auction Header */}
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-sm truncate">
              {a.auction_name || a.productname || "Untitled Auction"}
            </h4>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full border"
              style={{ borderColor: STATUS_COLORS[status], color: STATUS_COLORS[status] }}
            >
              {status}
            </span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1 text-xs text-gray-600">
            <div>
              <span className="font-medium">Type:</span> {a.auctiontype || "-"}
            </div>
            <div>
              <span className="font-medium">Subtype:</span> {a.auctionsubtype || "-"}
            </div>
            <div>
              <span className="font-medium">Currency:</span> {a.currency || "-"}
            </div>

            {a.categoryname && (
              <div>
                <span className="font-medium">Category:</span> {a.categoryname}
              </div>
            )}

            {a.currentbid ? (
              <div>
                <span className="font-medium">Current Bid:</span>{" "}
                {a.currency} {Number(a.currentbid).toLocaleString()}
              </div>
            ) : a.baseprice ? (
              <div>
                <span className="font-medium">Base Price:</span>{" "}
                {a.currency} {Number(a.baseprice).toLocaleString()}
              </div>
            ) : null}

            <div>
              <span className="font-medium">Start:</span>{" "}
              {a.scheduledstart
                ? new Date(a.scheduledstart).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </div>

            <div>
              <span className="font-medium">End:</span>{" "}
              {end
                ? end.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </div>

            {a.createdby && (
              <div className="col-span-2">
                <span className="font-medium">Seller:</span> {a.createdby}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
)}

        </Modal>
      </div>
    </AdminLayout>
  );
}
