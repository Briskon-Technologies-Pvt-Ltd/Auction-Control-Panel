"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Plus, LogOut } from "lucide-react";

export default function SellerPanel() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // 🔒 Role-based redirect with debug
  useEffect(() => {
    console.log("SellerPanel useEffect - user:", user);
    if (!user || !["seller", "both"].includes(user.role)) {
      console.log("Redirecting to / due to non-seller role");
      router.replace("/");
    }
  }, [user, router]);

  const handleNavigate = (path: string) => {
    console.log("Navigating to:", path); // Debug log
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/"); // ⏹ Redirect to landing or login page on logout
  };

  if (!user || !["seller", "both"].includes(user.role)) return null;

  const displayName = user.fname || user.lname || user.email?.split("@")[0] || "Seller";

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
                    (e.target as HTMLImageElement).src = "/placeholder-logo.png"; // Fallback logo
                  }}
                />
              </div>
              <div className="text-white font-semibold text-xl tracking-tight">
                Auction Wizard
              </div>
            </div>

            {/* User Info + Logout */}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Seller Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your auctions and listings
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-corporate-100 dark:bg-corporate-900/30 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">View My Listings</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Check and manage your active and past auction listings.
              </p>
              <Button
                onClick={() => handleNavigate("/seller-panel/my-listings")}
                className="bg-corporate-600 hover:bg-corporate-700 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Listings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-corporate-100 dark:bg-corporate-900/30 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Create New Auction</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Start a new auction by adding a listing.
              </p>
              <Button
                onClick={() => handleNavigate("/seller-panel/create-listing")}
                className="bg-corporate-600 hover:bg-corporate-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Auction
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
