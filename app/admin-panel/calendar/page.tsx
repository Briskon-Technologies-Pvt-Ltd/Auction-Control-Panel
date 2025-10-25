"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Clock,
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface AuctionEvent {
  auctionname: string;
  startdate: string;
  enddate: string;
  bidcount: number;
  auctionstatus: "Live" | "Upcoming" | "Closed";
  auctiontype: "forward" | "reverse";
}

export default function AuctionCalendarPage() {
  const [auctions, setAuctions] = useState<AuctionEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalAuctions, setModalAuctions] = useState<AuctionEvent[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await fetch("/api/calendar");
        const json = await res.json();
        if (json.success) setAuctions(json.data);
      } catch (e) {
        console.error("Error fetching auctions:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const pastelColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-green-100 text-green-800";
      case "Upcoming":
        return "bg-blue-100 text-blue-800";
      case "Closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const visibleAuctions = auctions.filter((a) => {
    const start = new Date(a.startdate);
    const end = new Date(a.enddate);
    return end >= monthStart && start <= monthEnd;
  });

  const getAuctionsForDate = (date: Date) =>
    visibleAuctions.filter((a) => {
      const start = new Date(a.startdate);
      const end = new Date(a.enddate);
      return date >= start && date <= end;
    });

  const formatRange = (start: Date, end: Date) => {
    const fmt = (d: Date) =>
      `${d.getDate()}${["th", "st", "nd", "rd"][
        ((d.getDate() + 90) % 100 - 10) % 10 - 1
      ] || "th"} ${d.toLocaleString("default", {
        month: "short",
      })}'${String(d.getFullYear()).slice(2)}`;
    return `${fmt(start)} → ${fmt(end)}`;
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const startIndex =
    viewMode === "week"
      ? Math.floor((today.getDate() + firstDayOfMonth - 1) / 7) * 7
      : 0;
 // Calculate total number of calendar slots (including leading blanks)
const totalCells =
viewMode === "week"
  ? 7
  : Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;

// Generate full calendar grid with leading blanks

const gridDays = Array.from({ length: totalCells }, (_, i) => {
const day = i - firstDayOfMonth + 1;
return day > 0 && day <= daysInMonth ? day : null; // null = blank cell
});


  if (loading)
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <Clock className="mr-2 w-5 h-5" /> Loading calendar...
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <p className="text-sm font-bold text-gray-500 mb-4"> AUCTION CALENDAR </p> 
      <div className="p-4 border border-blue-400 rounded-2xl bg-blue-50/30 shadow-sm">
        {/* Header compact */}
        <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={prevMonth}
              size="sm"
              className="bg-blue-200 hover:bg-blue-800 hover:text-white text-gray-800"
            >
              ← Prev
            </Button>
            <h2 className="text-md font-semibold text-xl text-gray-800">
              {currentDate.toLocaleString("default", { month: "long" })} {year}
            </h2>
            <Button
              onClick={nextMonth}
              size="sm"
              className="bg-blue-200 hover:bg-blue-800 hover:text-white text-gray-800"
            >
              Next →
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 text-center text-gray-700 text-xs font-semibold mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1 bg-blue-50 rounded">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          className={`grid grid-cols-7 gap-1 ${
            viewMode === "week"
              ? "auto-rows-[100px]"
              : "auto-rows-[95px] md:auto-rows-[100px]"
          }`}
        >
          {gridDays.map((day, idx) => {
        // Render an empty cell for padding (leading/trailing blanks)
        if (!day) {
          return <div key={`blank-${idx}`} />;
        }

        const date = new Date(year, month, day);
        const isToday =
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();

        const dayAuctions = getAuctionsForDate(date);

        return (
          <div
            key={`cell-${idx}-${day}`}
            
            className={`border border-gray-200 rounded-lg p-1 flex flex-col cursor-pointer transition
              ${isToday ? "bg-yellow-200 ring-2 ring-blue-400 ring-offset-1" : "bg-white hover:shadow-sm"}
            `}
            

            onClick={() => {
              setSelectedDate(date);
              setModalAuctions(dayAuctions);
            }}
          >
            <div className="text-[11px] font-semibold text-gray-600 mb-1">
              {day}
            </div>

            <div className="flex flex-col gap-[2px] overflow-y-auto flex-1">
              {dayAuctions.length === 0 ? (
                <div className="text-[10px] text-gray-400 italic text-center pt-2">
                  —
                </div>
              ) : (
                dayAuctions.slice(0, 3).map((a, i) => (
                  <TooltipProvider key={`tp-${idx}-${i}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-between h-4 px-2 rounded-full ${pastelColor(
                            a.auctionstatus
                          )} text-[10px]`}
                        >
                          <div className="flex items-center gap-1 truncate w-full">
                            {a.auctiontype === "forward" ? (
                              <ArrowUp className="w-3 h-3 text-green-600" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className="truncate">{a.auctionname}</span>
                            {(a.auctionstatus === "Live" ||
                              a.auctionstatus === "Closed") && (
                              <span className="ml-auto w-3.5 h-3.5 flex items-center justify-center rounded-full bg-white text-gray-800 font-semibold text-[8px]">
                                {a.bidcount}
                              </span>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>

                      <TooltipContent className="bg-blue-200 border border-blue-800 rounded-md p-3 shadow-md max-w-xs">
                        <div className="flex flex-col gap-1 text-[12px] text-gray-900 leading-snug">
                          <div className="font-semibold text-sm text-gray-900 border-b border-blue-400 pb-1">
                            Auction name:{" "}
                            <span className="font-bold text-gray-800">{a.auctionname}</span>
                          </div>

                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-medium">Auction type:</span>
                            {a.auctiontype === "forward" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className="capitalize">{a.auctiontype}</span>
                          </div>

                          <div className="flex justify-between mt-1">
                            <div>
                              <span className="font-medium">Start date:</span>
                              <div className="text-[11px] text-gray-800">
                                {new Date(a.startdate).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">End date:</span>
                              <div className="text-[11px] text-gray-800">
                                {new Date(a.enddate).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-medium">Bids placed:</span>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-800 text-white text-[10px] font-semibold">
                              {a.bidcount}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
              )}

              {dayAuctions.length > 3 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(date);
                    setModalAuctions(dayAuctions);
                  }}
                  className="text-[9px] text-blue-600 underline cursor-pointer text-right"
                >
                  Click : +{dayAuctions.length - 3} more auctions
                </div>
              )}
            </div>
          </div>
        );
          })}



        </div>

        {/* Legend */}
        <div className="flex justify-end gap-5 text-[12px] font-bold text-gray-700 mt-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>
            Live
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>
            Upcoming
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300"></span>
            Closed
          </div>
          <div className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-green-600" /> Forward
          </div>
          <div className="flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-red-500" /> Reverse
          </div>
        </div>

        {/* Modal */}
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-base">
                Auctions on{" "}
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </DialogTitle>
            </DialogHeader>
            {modalAuctions.length === 0 ? (
              <p className="text-gray-500 text-[12px]">No auctions on this date.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {modalAuctions.map((a, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border ${pastelColor(
                      a.auctionstatus
                    )} bg-opacity-40 flex flex-col`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[12px] truncate">{a.auctionname}</span>
                      {a.auctiontype === "forward" ? (
                        <ArrowUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <div className="text-[10px] text-gray-700 mt-1 leading-tight">
                      {a.auctionstatus} | {a.auctiontype} auction
                      <br />
                      {formatRange(new Date(a.startdate), new Date(a.enddate))}
                      <br />
                      Bids:{" "}
                      <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-800 text-white text-[8px] rounded-full">
                        {a.bidcount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
