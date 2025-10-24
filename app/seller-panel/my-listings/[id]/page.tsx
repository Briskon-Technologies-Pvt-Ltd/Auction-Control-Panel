"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

// Define the Auction interface based on the reference
interface AuctionDuration {
  days?: number;
  hours?: number;
  minutes?: number;
}

interface Attribute {
  id?: string;
  name?: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}

interface Auction {
  id: string;
  productname?: string;
  title?: string;
  categoryid?: string;
  auctiontype: "forward" | "reverse";
  currentbid?: number;
  bidincrementtype?: "fixed" | "percentage";
  minimumincrement?: number;
  startprice?: number;
  scheduledstart?: string | null;
  auctionduration?: AuctionDuration;
  bidders?: number;
  watchers?: number;
  productimages?: string[];
  productdocuments?: string[];
  productdescription?: string;
  specifications?: string; // JSON string or null
  buyNowPrice?: number;
  participants?: string[];
  bidcount?: number;
  createdby?: string;
  questions?: { user: string; question: string; answer: string | null; question_time: string | null; answer_time: string | null }[];
  question_count?: number;
  issilentauction?: boolean;
  currentbidder?: string;
  percent?: number;
  attributes?: string; // JSON string or null
  sku?: string;
  brand?: string;
  model?: string;
  reserveprice?: number;
  auctionsubtype?: string;
}

// Function to render key-value blocks from JSON data
function renderKeyValueBlock(
  data: string | Record<string, any> | undefined,
  fallback: string
): React.ReactNode {
  try {
    const parsed: Attribute[] =
      typeof data === "string" ? JSON.parse(data) : data ?? [];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return (
        <span className="text-gray-600 dark:text-gray-300 ml-4">
          {fallback}
        </span>
      );
    }

    return (
      <>
        {parsed.map((attr, index) =>
          attr.value ? (
            <div key={index} className="text-gray-600 dark:text-gray-300 ml-4 flex items-center gap-2">
              <span className="font-medium">{attr.name}:</span>
              {attr.type === "color" ? (
                <span
                  className="inline-block w-4 h-4 rounded-sm border ml-1"
                  style={{ backgroundColor: attr.value as string }}
                  title={attr.value as string}
                ></span>
              ) : (
                attr.value
              )}
            </div>
          ) : null
        )}
      </>
    );
  } catch {
    return (
      <span className="text-gray-600 dark:text-gray-300 ml-4">
        Invalid attributes data
      </span>
    );
  }
}

export default function AuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;
  const router = useRouter();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchAuctionDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listings/${auctionId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to fetch auction");
        setAuction(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchAuctionDetails();
  }, [auctionId]);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (auction?.productimages?.length ?? 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (auction?.productimages?.length ?? 1) - 1 ? 0 : prev + 1
    );
  };

  if (loading) return <div className="text-center py-20 text-lg text-gray-600 dark:text-gray-300">Loading...</div>;
  if (error) return <div className="text-center py-20 text-lg text-red-600 dark:text-red-400">{error}</div>;
  if (!auction) return <div className="text-center py-20 text-lg text-gray-600 dark:text-gray-300">Auction not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-corporate-700 via-corporate-600 to-corporate-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <img
                  src="/briskon-auction-horizontal-logo-white.png"
                  alt="Briskon Auction Logo"
                  className="h-12 w-auto object-contain transition-transform hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-logo.png";
                  }}
                />
              </div>
              <div className="text-white font-semibold text-2xl tracking-wide">
                Auction Wizard
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push("/seller-panel")}
                className="flex items-center text-base font-semibold text-white border-corporate-300 dark:border-gray-600 bg-corporate-700/20 hover:bg-corporate-800/40 dark:hover:bg-gray-700/40 rounded-lg px-4 py-2 transition-all duration-300 hover:shadow-md"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/seller-panel/my-listings")}
                className="flex items-center text-base font-semibold text-white border-corporate-300 dark:border-gray-600 bg-corporate-700/20 hover:bg-corporate-800/40 dark:hover:bg-gray-700/40 rounded-lg px-4 py-2 transition-all duration-300 hover:shadow-md"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                My Listings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-0 relative">
                <Image
                  src={auction.productimages?.[currentImageIndex] || "/placeholder.svg"}
                  alt={auction.productname || auction.title || "Auction Item"}
                  width={800}
                  height={500}
                  className="w-full h-[450px] object-cover rounded-t-lg transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-1 rounded-full shadow-md">
                  {`${currentImageIndex + 1}/${auction.productimages?.length ?? 1}`}
                </div>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 text-gray-800 p-2 rounded-full shadow-lg hover:bg-white/90 transition-all duration-300"
                >
                  ←
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 text-gray-800 p-2 rounded-full shadow-lg hover:bg-white/90 transition-all duration-300"
                >
                  →
                </button>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-b-lg">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {auction.productimages?.map((image, index) => (
                      <Image
                        key={index}
                        src={image || "/placeholder.svg"}
                        alt={`${auction.productname || auction.title} ${index + 1}`}
                        width={120}
                        height={90}
                        className="w-24 h-18 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-corporate-500 transition-all duration-300 hover:shadow-md"
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                  {auction.productname || auction.title || "Untitled Auction"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Description</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                      {auction.productdescription || "No description available"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Specifications</h3>
                    <div className="text-gray-600 dark:text-gray-300 text-base space-y-2">
                      {auction.sku && <div>SKU: {auction.sku}</div>}
                      {auction.brand && <div>Brand: {auction.brand}</div>}
                      {auction.model && <div>Model: {auction.model}</div>}
                      {auction.reserveprice && (
                        <div>Reserve Price: ${auction.reserveprice.toLocaleString()}</div>
                      )}
                      {auction.attributes && (
                        <div>
                          <span className="font-medium">Attributes</span>
                          {renderKeyValueBlock(auction.attributes, "No attributes data")}
                        </div>
                      )}
                      {auction.specifications && (
                        <div>
                          <span className="font-medium">Specifications</span>
                          {renderKeyValueBlock(auction.specifications, "No specifications data")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Questions & Answers</h3>
                    {auction.questions?.length ? (
                      auction.questions.map((qa, index) => (
                        <div key={index} className="border-b py-4">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{qa.user}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {qa.question_time ? new Date(qa.question_time).toLocaleString() : "N/A"}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">{qa.question}</p>
                          {qa.answer && (
                            <div className="ml-4 mt-2 text-green-600 dark:text-green-400">
                              <span className="font-medium">Answer:</span> {qa.answer} (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {qa.answer_time ? new Date(qa.answer_time).toLocaleString() : "N/A"}
                              </span>
                              )
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">No questions available</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Documentation</h3>
                    {auction.productdocuments?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        {auction.productdocuments.map((doc, index) => (
                          <a
                            key={index}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            <span className="text-lg font-medium text-corporate-600 dark:text-corporate-400">
                              Document {index + 1}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">No documentation available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Auction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Product Name", value: auction.productname || auction.title || "N/A" },
                  { label: "Category", value: auction.categoryid || "Uncategorized" },
                  { label: "Auction Type", value: auction.auctiontype === "forward" ? "Forward" : "Reverse" },
                  { label: "Auction Subtype", value: auction.auctionsubtype || "N/A" },
                  { label: "Start Price", value: `$${((auction.startprice ?? 0) || "N/A").toLocaleString()}` },
                  { label: "Current Bid", value: `$${((auction.currentbid ?? 0) || "N/A").toLocaleString()}` },
                  ...(auction.buyNowPrice ? [{ label: "Buy Now Price", value: `$${auction.buyNowPrice.toLocaleString()}` }] : []),
                  { label: "Total Bids", value: auction.bidcount || 0 },
                  { label: "Scheduled Start", value: auction.scheduledstart ? new Date(auction.scheduledstart).toLocaleString() : "N/A" },
                  {
                    label: "Auction Duration",
                    value: `${auction.auctionduration?.days || 0} days, ${auction.auctionduration?.hours || 0} hours, ${auction.auctionduration?.minutes || 0} minutes`,
                  },
                  { label: "Bidders", value: auction.bidders || 0 },
                  { label: "Watchers", value: auction.watchers || 0 },
                  { label: "Created By", value: auction.createdby || "Unknown" },
                  { label: "Current Bidder", value: auction.currentbidder || "N/A" },
                  ...(auction.reserveprice ? [{ label: "Reserve Price", value: `$${auction.reserveprice.toLocaleString()}` }] : []),
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
