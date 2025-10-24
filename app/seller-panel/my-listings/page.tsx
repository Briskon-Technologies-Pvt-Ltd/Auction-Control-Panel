"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, ArrowLeft, LogOut, Check, X } from "lucide-react";

// Define the Auction interface based on API response
interface AuctionDuration {
  days: number;
  hours: number;
  minutes: number;
}

interface Auction {
  id: string;
  productname: string;
  auctiontype: string;
  auctionsubtype: string;
  minimumincrement: number;
  startprice: number;
  targetprice: number;
  auctionduration: AuctionDuration; // Object type
  approved: boolean;
  editable: boolean;
  createdat: string;
}

export default function MyListings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filterApproved, setFilterApproved] = useState("all");
  const [filterEditable, setFilterEditable] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAuctions: 0,
    approvedAuctions: 0,
    pendingAuctions: 0,
    editableAuctions: 0,
    nonEditableAuctions: 0,
  });

  useEffect(() => {
    // Only proceed if user is loaded and has the correct role
    if (!user) {
      console.log("User not loaded yet, skipping fetch");
      return;
    }
    if (!["seller", "both"].includes(user.role)) {
      console.log("Redirecting to / due to non-seller role");
      router.replace("/");
      return;
    }

    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listings?email=${encodeURIComponent(user.email)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        console.log("Full API Response:", data);
        if (data.success) {
          const auctionsData = Array.isArray(data.data) ? data.data : [];
          console.log("Processed Auctions Data:", auctionsData);
          auctionsData.forEach((item: Auction, index: number) => {
            console.log(`Auction ${index + 1}:`, item);
            item.auctionduration = typeof item.auctionduration === "object" && item.auctionduration !== null
              ? item.auctionduration
              : { days: 0, hours: 0, minutes: 0 };
          });
          setAuctions(auctionsData);
          setStats({
            totalAuctions: auctionsData.length,
            approvedAuctions: auctionsData.filter((a: Auction) => a.approved).length,
            pendingAuctions: auctionsData.filter((a: Auction) => !a.approved).length,
            editableAuctions: auctionsData.filter((a: Auction) => a.editable).length,
            nonEditableAuctions: auctionsData.filter((a: Auction) => !a.editable).length,
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
    console.log("Navigating to:", path);
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        const res = await fetch(`/api/listings/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.success) {
          setAuctions(auctions.filter((auction) => auction.id !== id));
          setStats((prev) => ({
            ...prev,
            totalAuctions: prev.totalAuctions - 1,
            approvedAuctions: prev.approvedAuctions - (auctions.find(a => a.id === id)?.approved ? 1 : 0),
            pendingAuctions: prev.pendingAuctions - (!auctions.find(a => a.id === id)?.approved ? 1 : 0),
            editableAuctions: prev.editableAuctions - (auctions.find(a => a.id === id)?.editable ? 1 : 0),
            nonEditableAuctions: prev.nonEditableAuctions - (!auctions.find(a => a.id === id)?.editable ? 1 : 0),
          }));
          window.location.reload(); // Reload the page after deletion
        } else {
          console.error("Delete error:", data.error);
        }
      } catch (error) {
        console.error("Failed to delete auction:", error);
      }
    }
  };

  const filteredAuctions = auctions.filter((auction) => {
    const approvedMatch = filterApproved === "all" || (filterApproved === "approved" ? auction.approved : !auction.approved);
    const editableMatch = filterEditable === "all" || (filterEditable === "editable" ? auction.editable : !auction.editable);
    return approvedMatch && editableMatch;
  });

  // Only render if user is loaded and has the correct role
  if (!user || !["seller", "both"].includes(user.role)) {
    return null; // Or a loading spinner if preferred
  }

  const displayName = user.fname || user.lname || user.email?.split("@")[0] || "Seller";

  // Function to safely format createdat
  function formatcreatedat(dateStr: string) {
    if (!dateStr || dateStr.trim() === "") return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "N/A" : date.toISOString().slice(0, 19).replace("T", " ");
  }

  // Function to determine price to display
  function getDisplayedPrice(auction: Auction) {
    return auction.auctiontype === "reverse" ? `Target: $${auction.targetprice}` : `Start: $${auction.startprice}`;
  }

  // Function to format auction duration
  function formatAuctionDuration(duration: AuctionDuration) {
    const parts = [];
    if (duration.days > 0) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
    if (duration.hours > 0) parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    if (duration.minutes > 0) parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : "0 days, 0 hours, 0 minutes";
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

            {/* User Info + Logout + Back */}
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
                onClick={() => handleNavigate("/seller-panel")}
                className="flex items-center text-sm font-medium text-white border-corporate-300 dark:border-gray-600 bg-transparent hover:bg-corporate-800/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Seller Panel
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
              My Listings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your auction listings
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={filterEditable}
              onChange={(e) => setFilterEditable(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Editable</option>
              <option value="editable">Editable</option>
              <option value="non-editable">Non-Editable</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Listings
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
                    Approved Listings
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
                    Pending Listings
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingAuctions}
                  </p>
                </div>
                <X className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Editable Listings
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.editableAuctions}
                  </p>
                </div>
                <Edit className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Non-Editable Listings
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.nonEditableAuctions}
                  </p>
                </div>
                <X className="w-8 h-8 text-red-600" />
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
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Product Name</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Auction Type</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Auction Subtype</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Minimum Increment</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Price</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Auction Duration</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Approved</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuctions.map((auction) => (
                      <tr
                        key={auction.id}
                        className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="p-4">{auction.productname}</td>
                        <td className="p-4">{auction.auctiontype}</td>
                        <td className="p-4">{auction.auctionsubtype}</td>
                        <td className="p-4">${auction.minimumincrement}</td>
                        <td className="p-4">{getDisplayedPrice(auction)}</td>
                        <td className="p-4">{formatAuctionDuration(auction.auctionduration)}</td>
                        <td className="p-4">{auction.approved ? "Yes" : "No"}</td>
                        <td className="p-4 flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleNavigate(`/seller-panel/my-listings/${auction.id}`)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleNavigate(`/seller-panel/my-listings/edit/${auction.id}`)}
                            className="text-green-600 hover:text-green-700"
                            disabled={!auction.editable}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(auction.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAuctions.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 p-4">
                  No listings found.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Function to determine price to display
function getDisplayedPrice(auction: Auction) {
  return auction.auctiontype === "reverse" ? `Target: $${auction.targetprice}` : `Start: $${auction.startprice}`;
}

// Function to format auction duration
function formatAuctionDuration(duration: AuctionDuration) {
  const parts = [];
  if (duration.days > 0) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
  if (duration.hours > 0) parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
  if (duration.minutes > 0) parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : "0 days, 0 hours, 0 minutes";
}

// Function to safely format createdat
function formatcreatedat(dateStr: string) {
  if (!dateStr || dateStr.trim() === "") return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "N/A" : date.toISOString().slice(0, 19).replace("T", " ");
}
