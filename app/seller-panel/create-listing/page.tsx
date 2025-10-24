"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuctionBuilderWizard from "@/auction-wizard"; // Adjust path based on your project structure
import { ArrowLeft, LogOut } from "lucide-react";

export default function CreateAuction() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // 🔒 Role-based redirect with debug
  useEffect(() => {
    console.log("CreateAuction useEffect - user:", user);
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-corporate-700 via-corporate-600 to-corporate-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 p-6 text-white shadow-lg">
            <CardTitle className="text-2xl font-bold">Create New Auction</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AuctionBuilderWizard />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
