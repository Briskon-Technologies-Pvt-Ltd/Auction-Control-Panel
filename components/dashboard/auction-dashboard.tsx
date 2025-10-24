"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent,DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LiveAuctionRoom from "../bidding/live-auction-room";
import ThemeToggle from "../../theme-toggle";
import { CheckCircle, XCircle } from "lucide-react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Play,
} from "lucide-react";

interface AuctionItem {
  id: string;
  title: string;
  description: string;
  auctionType: "forward" | "reverse";
  auctionSubType: string;
  startPrice: number;
  currentBid?: number;
  currency: string;
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled";
  createdBy: string;
  createdByName: string;
  createdAt: string;
  scheduledStart?: string;
  endTime?: string;
  participantCount: number;
  bidCount: number;
  category: string;
  images: string[];
  approved?: boolean;
}

// Mock auction data - in production this would come from your database
const MOCK_AUCTIONS: AuctionItem[] = [
  {
    id: "auction-1",
    title: "Vintage Art Collection",
    description: "Rare vintage art pieces from the 19th century",
    auctionType: "forward",
    auctionSubType: "english",
    startPrice: 5000,
    currentBid: 7500,
    currency: "USD",
    status: "live",
    createdBy: "admin@auction.com",
    createdByName: "Admin User",
    createdAt: "2024-01-15T10:00:00Z",
    scheduledStart: "2024-01-20T14:00:00Z",
    endTime: "2024-01-25T14:00:00Z",
    participantCount: 24,
    bidCount: 47,
    category: "Art & Collectibles",
    images: ["/placeholder.svg?height=200&width=300&text=Vintage+Art+Collection"],
    approved: true,
  },
  {
    id: "auction-2",
    title: "Office Equipment Liquidation",
    description: "Complete office setup including furniture and electronics",
    auctionType: "reverse",
    auctionSubType: "standard",
    startPrice: 15000,
    currentBid: 12000,
    currency: "USD",
    status: "scheduled",
    createdBy: "auctioneer@auction.com",
    createdByName: "John Auctioneer",
    createdAt: "2024-01-18T09:30:00Z",
    scheduledStart: "2024-01-22T10:00:00Z",
    endTime: "2024-01-24T10:00:00Z",
    participantCount: 8,
    bidCount: 0,
    category: "Business Equipment",
    images: ["/placeholder.svg?height=200&width=300&text=Office+Equipment"],
    approved: false,
  },
  {
    id: "auction-3",
    title: "Luxury Watch Collection",
    description: "Premium Swiss watches from renowned brands",
    auctionType: "forward",
    auctionSubType: "sealed",
    startPrice: 25000,
    currency: "USD",
    status: "draft",
    createdBy: "org@auction.com",
    createdByName: "Luxury Org",
    createdAt: "2024-01-19T16:45:00Z",
    participantCount: 0,
    bidCount: 0,
    category: "Luxury Goods",
    images: ["/placeholder.svg?height=200&width=300&text=Luxury+Watches"],
    approved: false,
  },
  {
    id: "auction-4",
    title: "Industrial Machinery Auction",
    description: "Heavy machinery and industrial equipment",
    auctionType: "forward",
    auctionSubType: "dutch",
    startPrice: 50000,
    currentBid: 45000,
    currency: "USD",
    status: "ended",
    createdBy: "admin@auction.com",
    createdByName: "Admin User",
    createdAt: "2024-01-10T08:00:00Z",
    scheduledStart: "2024-01-12T09:00:00Z",
    endTime: "2024-01-15T17:00:00Z",
    participantCount: 15,
    bidCount: 89,
    category: "Industrial",
    images: ["/placeholder.svg?height=200&width=300&text=Industrial+Machinery"],
    approved: true,
  },
];

interface AuctionDashboardProps {
  onCreateAuction: () => void;
}

export default function AuctionDashboard({ onCreateAuction }: AuctionDashboardProps) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<AuctionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await fetch("/api/auctions"); // Fetch all auctions
        const json = await res.json();
        if (!json.success) {
          setAuctions([]);
          setFilteredAuctions([]);
          return;
        }
        // Map DB fields to AuctionItem interface
        const mapped: AuctionItem[] = (json.data.auctions || []).map((a: any) => ({
          id: a.id,
          title: a.productname || a.title || "Untitled Auction",
          description: a.productdescription || a.description || "",
          auctionType: a.auctiontype,
          auctionDuration: a.auctionduration || {},
          auctionSubType: a.auctionsubtype,
          startPrice: a.startprice ?? 0,
          currentBid: a.currentbid ?? undefined,
          currency: a.currency || "USD",
          status: (a.status as AuctionItem["status"]) || "draft",
          createdBy: a.createdby || "",
          createdByName: a.createdbyname || a.createdby || "",
          createdAt: a.createdat || "",
          scheduledStart: a.scheduledstart || "",
          endTime: a.endtime || "",
          participantCount: Array.isArray(a.participantemails) ? a.participantemails.length : 0,
          bidCount: a.bidcount ?? 0,
          category: a.categoryid || "",
          images: Array.isArray(a.productimages)
            ? a.productimages
            : Array.isArray(a.productimages?.urls) ? a.productimages.urls : [],
          approved: a.approved || false,
        }));
        // For non-admin users, filter to only show their own auctions
        let userAuctions = mapped;
        if (user?.role !== "admin") {
          userAuctions = mapped.filter((auction: any) => auction?.createdBy === user?.email);
        }
        setAuctions(userAuctions);
        setFilteredAuctions(userAuctions);
      } catch (e) {
        setAuctions([]);
        setFilteredAuctions([]);
      }
    };
    fetchAuctions();
  }, [user]);

  useEffect(() => {
    // Apply filters
    let filtered = auctions;

    if (searchTerm) {
      filtered = filtered.filter(
        (auction) =>
          auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          auction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          auction.category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((auction) => auction.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((auction) => auction.auctionType === typeFilter);
    }

    setFilteredAuctions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [auctions, searchTerm, statusFilter, typeFilter]);

  // If viewing a live auction, show the auction room
  if (selectedAuctionId) {
    return <LiveAuctionRoom auctionId={selectedAuctionId} onBack={() => setSelectedAuctionId(null)} />;
  }

  const getStatusColor = (approved: boolean) => {
    return approved
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAuctions = filteredAuctions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate dashboard statistics
  const stats = {
    total: auctions.length,
    live: auctions.filter((a) => a.status === "live").length,
    scheduled: auctions.filter((a) => a.status === "scheduled").length,
    ended: auctions.filter((a) => a.status === "ended").length,
    totalValue: auctions.reduce((sum, a) => sum + (a.currentBid || a.startPrice), 0),
  };

  if (user?.role === "seller" && auctions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-corporate-100 dark:bg-corporate-900/30 rounded-full flex items-center justify-center mb-6">
            <Plus className="w-12 h-12 text-corporate-600 dark:text-corporate-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Your First Auction</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Get started by creating your first auction. Set up your products, configure bidding parameters, and launch
            your auction to start receiving bids.
          </p>
          <Button onClick={onCreateAuction} size="lg" className="bg-corporate-600 hover:bg-corporate-700">
            <Plus className="w-5 h-5 mr-2" />
            Create New Auction
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user?.role === "admin" ? "All Auctions" : "My Auctions"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.role === "admin"
              ? "Manage and monitor all auctions across the platform"
              : "Manage your auction listings and track performance"}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Auctions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Live Auctions</p>
                <p className="text-2xl font-bold text-green-600">{stats.live}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.ended}</p>
              </div>
              <Users className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-corporate-600 dark:text-corporate-400">
                  {formatCurrency(stats.totalValue, "USD")}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-corporate-600 dark:text-corporate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="forward">Forward</SelectItem>
            <SelectItem value="reverse">Reverse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No auctions found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first auction to get started"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAuctions.map((auction) => (
              <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  <img
                    src={auction.images[0] || "/placeholder.svg"}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={getStatusColor(auction.approved || false)}>
                      {auction.approved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedAuctionId(auction.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {auction.status === "live" && (
                          <DropdownMenuItem onClick={() => setSelectedAuctionId(auction.id)}>
                            <Play className="w-4 h-4 mr-2" />
                            Join Live Auction
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Auction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{auction.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{auction.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {auction.auctionType.charAt(0).toUpperCase() + auction.auctionType.slice(1)} •{" "}
                        {auction.auctionSubType}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{auction.category}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {auction.currentBid ? "Current Bid" : "Starting Price"}
                        </span>
                        <span className="font-semibold text-corporate-600 dark:text-corporate-400">
                          {auction.bidCount > 0 ? formatCurrency(auction.currentBid || auction.startPrice, auction.currency) : "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Participants</span>
                        <span className="font-medium">{auction.participantCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Bids</span>
                        <span className="font-medium">{auction.bidCount}</span>
                      </div>
                    </div>

                    {/* Live Auction Action Button */}
                    {auction.status === "live" && (
                      <Button
                        onClick={() => setSelectedAuctionId(auction.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Join Live Auction
                      </Button>
                    )}

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Created: {formatDate(auction.createdAt)}
                      </div>
                      {auction.scheduledStart && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {auction.status === "scheduled" ? "Starts" : "Started"}: {formatDate(auction.scheduledStart)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
