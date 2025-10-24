"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, LogOut, Check, X, Trash2 } from "lucide-react";

// Define the Auction interface based on API response
interface Auction {
  id: string;
  productname: string;
  createdat: string;
  createdby: string;
  ended: boolean;
  approved: boolean;
  auctiontype: string;
  approval_status?: string
}

export default function ManageAuctions() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAuctions: 0,
    approvedAuctions: 0,
    pendingAuctions: 0,
  });

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
      return;
    }

    const fetchAuctions = async () => {
      try {
        const res = await fetch("/api/auctions");
        const data = await res.json();
        console.log("Full API Response:", data); // Log the entire response
        if (data.success) {
          const auctionsData = Array.isArray(data.data.auctions) ? data.data.auctions : [];
          console.log("Processed Auctions Data:", auctionsData); // Log processed data
          auctionsData.forEach((item: Auction, index: number) => {
            console.log(`Auction ${index + 1}:`, item); // Log each auction object
          });
          setAuctions(auctionsData);
          // Calculate stats with explicit typing
          setStats({
            totalAuctions: auctionsData.length,
            approvedAuctions: auctionsData.filter((a: Auction) => a.approved).length,
            pendingAuctions: auctionsData.filter((a: Auction) => !a.approved).length,
          });
        } else {
          console.error("API error:", data.error);
        }
      } catch (error) {
        console.error("Failed to fetch auctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, [user, router]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/auctions/${id}`, {
        method: "PUT",
      });
      const data = await res.json();
      if (data.success) {
        setAuctions(
          auctions.map((auction) =>
            auction.id === id ? { ...auction, approved: true } : auction
          )
        );
        setStats((prev) => ({
          ...prev,
          approvedAuctions: prev.approvedAuctions + 1,
          pendingAuctions: prev.pendingAuctions - 1,
        }));
      }
    } catch (error) {
      console.error("Failed to approve auction:", error);
    }
  };

const handleReject = async (id: string) => {
  try {
    const res = await fetch(`/api/status-auctions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_status: "rejected" }),
    });

    // Be defensive: if server returns HTML on error, avoid JSON parse crash
    const data = await res.json().catch(() => ({} as any));

    if (res.ok && data?.success) {
      // Hide from UI
      setAuctions(prev => prev.filter(a => a.id !== id));
    } else {
      console.error("Reject failed:", res.status, data?.message);
    }
  } catch (e) {
    console.error("Error rejecting auction:", e);
  }
};  



  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/auctions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAuctions(auctions.filter((auction) => auction.id !== id));
        setStats((prev) => ({
          ...prev,
          totalAuctions: prev.totalAuctions - 1,
          approvedAuctions: prev.approvedAuctions - 1,
        }));
      }
    } catch (error) {
      console.error("Failed to delete auction:", error);
    }
  };

  // const filteredAuctions = auctions.filter((auction) => {
  //   if (filter === "all") return true;
  //   if (filter === "approved") return auction.approved;
  //   if (filter === "pending") return !auction.approved;
  //   return true;
  // });
  const filteredAuctions = auctions.filter((auction) => {
  if (auction.approval_status === "rejected") return false;
  if (filter === "all") return true;
  if (filter === "approved") return auction.approved;
  if (filter === "pending") return !auction.approved;
  return true;
});


  if (!user || user.role !== "admin") return null;

  const displayName = user.fname || user.lname || user.email?.split("@")[0] || "Admin";

  // Function to safely format createdat
  function formatcreatedat(dateStr: string) {
    if (!dateStr || dateStr.trim() === "") return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "N/A" : date.toISOString().slice(0, 19).replace("T", " ");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-corporate-700 via-corporate-600 to-corporate-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo + Branding */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <img
                  src="/briskon-auction-horizontal-logo-white.png"
                  alt="Briskon Auction Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-logo.png";
                  }}
                />
              </div>
              <div className="text-white font-semibold text-xl tracking-tight">
                Auction Wizard
              </div>
            </div>

            {/* User Info + Logout + Dashboard */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-white">
                  Welcome, {displayName}
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-corporate-100 to-corporate-200 text-corporate-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 rounded-full shadow-sm">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => handleNavigate("/admin-panel")}
                className="flex items-center text-sm font-medium text-white border-corporate-300 dark:border-gray-600 bg-transparent hover:bg-corporate-800/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
              >
                <Eye className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center text-sm font-medium text-white border-corporate-300 dark:border-gray-600 bg-transparent hover:bg-corporate-800/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Manage Auctions
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View, approve, reject, and delete auctions
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Auctions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalAuctions}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Approved Auctions
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approvedAuctions}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Auctions
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingAuctions}
                  </p>
                </div>
                <X className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Product Name
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Created At
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Created By
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Ended
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Approved
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Auction Type
                      </th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuctions.map((auction) => (
                      <tr
                        key={auction.id}
                        className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="p-4">{auction.productname}</td>
                        <td className="p-4">{formatcreatedat(auction.createdat)}</td>
                        <td className="p-4">{auction.createdby}</td>
                        <td className="p-4">{auction.ended ? "Yes" : "No"}</td>
                        <td className="p-4">{auction.approved ? "Yes" : "No"}</td>
                        <td className="p-4">{auction.auctiontype}</td>
                        <td className="p-4 flex space-x-2">
                          {!auction.approved && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleApprove(auction.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleReject(auction.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {auction.approved && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(auction.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAuctions.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 p-4">
                  No auctions found.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Function to safely format createdat
function formatcreatedat(dateStr: string) {
  if (!dateStr || dateStr.trim() === "") return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "N/A" : date.toISOString().slice(0, 19).replace("T", " ");
}
