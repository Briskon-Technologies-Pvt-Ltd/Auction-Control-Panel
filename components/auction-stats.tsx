"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Gavel,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

/* ---------------- Types ---------------- */
type StatusCounts = { Live: number; Upcoming: number; Closed: number; Pending: number; Unknown?: number };
type Subtype = { total: number; status: StatusCounts };
type SideData = {
  total: number;
  status: StatusCounts;
  subtypes: Record<string, Subtype>;
};
type StatsResponse = {
  summary: StatusCounts & { total: number };
  forward: SideData;
  reverse: SideData;
};

/* ---------------- Reusable Components ---------------- */
function SmallDot({ color }: { color: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function StatusChip({
  label,
  value,
  colorClass,
  onClick,
}: {
  label: string;
  value: number;
  colorClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/60 border border-gray-100 shadow-sm text-left w-full hover:bg-blue-50 hover:shadow transition-all"
    >
      <SmallDot color={colorClass} />
      <div className="text-xs text-gray-700">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray-500 font-semibold">{value}</div>
      </div>
    </button>
  );
}

/* ---------------- Modal ---------------- */
function Modal({ open, title, onClose, children }: any) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[90%] md:w-[70%] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- Auction List in Modal ---------------- */
function AuctionList({ auctions }: { auctions: any[] }) {
  if (!auctions?.length)
    return (
      <div className="text-center text-gray-500 text-sm py-10">
        No auctions found for this selection.
      </div>
    );

  return (
    <div className="grid gap-3">
      {auctions.map((a, idx) => (
        <div
          key={idx}
          className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition"
        >
          <div className="font-semibold text-gray-800">{a.auction_name}</div>
          <div className="text-xs text-gray-500 mt-1">
            Type: {a.auctiontype} | Subtype: {a.auctionsubtype || "N/A"}
          </div>
          <div className="text-xs text-gray-500">
            Status: {a.status || "-"} | Currency: {a.currency || "USD"}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Main Component ---------------- */
export default function AuctionStatisticsPanel() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalAuctions, setModalAuctions] = useState<any[]>([]);

  const [openForward, setOpenForward] = useState(true);
  const [openReverse, setOpenReverse] = useState(true);

  // fetch statistics
  useEffect(() => {
    setLoading(true);
    fetch("/api/auction-stats")
      .then((r) => r.json())
      .then((json) => {
        setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // function to open modal and fetch list
  const handleShowList = async ({
    type,
    subtype,
    status,
  }: {
    type?: "forward" | "reverse";
    subtype?: string;
    status?: string;
  }) => {
    try {
      setModalOpen(true);
      setModalTitle(
        `${type ? type.charAt(0).toUpperCase() + type.slice(1) : "All"} ${
          subtype ? " - " + subtype : ""
        } ${status ? "(" + status + ")" : ""} Auctions`
      );
      setModalAuctions([]);

      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (subtype) params.set("subtype", subtype);
      if (status) params.set("status", status);

      const res = await fetch(`/api/auctions?${params.toString()}`);
      const json = await res.json();
      setModalAuctions(json?.data?.auctions || []);
    } catch (err) {
      console.error("Failed to load auctions", err);
      setModalAuctions([]);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (!data) return <div className="text-sm text-red-500">No data available.</div>;

  const { summary, forward, reverse } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">
          Auction Statistics Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL */}
        <div className="rounded-xl border border-blue-100 p-4 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">
                Total Auctions
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.total}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatusChip
              label="Live"
              value={summary.Live}
              colorClass="bg-green-500"
              onClick={() => handleShowList({ status: "live" })}
            />
            <StatusChip
              label="Upcoming"
              value={summary.Upcoming}
              colorClass="bg-blue-500"
              onClick={() => handleShowList({ status: "upcoming" })}
            />
            <StatusChip
              label="Closed"
              value={summary.Closed}
              colorClass="bg-neutral-800"
              onClick={() => handleShowList({ status: "closed" })}
            />
            <StatusChip
              label="Pending Approval"
              value={summary.Pending}
              colorClass="bg-amber-500"
              onClick={() => handleShowList({ status: "pending" })}
            />
          </div>
        </div>

        {/* FORWARD */}
        <div className="rounded-xl border border-green-100 p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50">
                <Gavel className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  Forward Auctions
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {forward.total}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpenForward((s) => !s)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              {openForward ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {openForward && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(forward.status).map(([key, val]) => (
                  <StatusChip
                    key={key}
                    label={key}
                    value={val}
                    colorClass={
                      key === "Live"
                        ? "bg-green-500"
                        : key === "Upcoming"
                        ? "bg-blue-500"
                        : key === "Closed"
                        ? "bg-neutral-800"
                        : "bg-amber-500"
                    }
                    onClick={() =>
                      handleShowList({ type: "forward", status: key.toLowerCase() })
                    }
                  />
                ))}
              </div>

              <div className="mt-3 space-y-1">
                {Object.entries(forward.subtypes || {}).map(([key, sub]) => (
                  <button
                    key={key}
                    onClick={() =>
                      handleShowList({
                        type: "forward",
                        subtype: key,
                      })
                    }
                    className="w-full text-left text-sm text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 border border-gray-100"
                  >
                    <span className="font-semibold capitalize">{key}</span> ({sub.total})
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* REVERSE */}
        <div className="rounded-xl border border-red-100 p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-50">
                <Gavel className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  Reverse Auctions
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {reverse.total}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpenReverse((s) => !s)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              {openReverse ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {openReverse && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(reverse.status).map(([key, val]) => (
                  <StatusChip
                    key={key}
                    label={key}
                    value={val}
                    colorClass={
                      key === "Live"
                        ? "bg-green-500"
                        : key === "Upcoming"
                        ? "bg-blue-500"
                        : key === "Closed"
                        ? "bg-neutral-800"
                        : "bg-amber-500"
                    }
                    onClick={() =>
                      handleShowList({ type: "reverse", status: key.toLowerCase() })
                    }
                  />
                ))}
              </div>

              <div className="mt-3 space-y-1">
                {Object.entries(reverse.subtypes || {}).map(([key, sub]) => (
                  <button
                    key={key}
                    onClick={() =>
                      handleShowList({
                        type: "reverse",
                        subtype: key,
                      })
                    }
                    className="w-full text-left text-sm text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 border border-gray-100"
                  >
                    <span className="font-semibold capitalize">{key}</span> ({sub.total})
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL */}
      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      >
        <AuctionList auctions={modalAuctions} />
      </Modal>
    </div>
  );
}
