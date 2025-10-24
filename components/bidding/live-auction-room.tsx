"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../auth/auth-provider"
import { useWebSocket } from "../../hooks/use-websocket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Gavel, Users, TrendingUp, AlertCircle, Zap, Heart, Share2, MessageCircle, Wifi, WifiOff } from "lucide-react"

interface BidHistory {
  id: string
  amount: number
  bidder: string
  timestamp: string
  isWinning: boolean
  isYourBid: boolean
}

interface AuctionData {
  id: string
  title: string
  description: string
  currentBid: number
  startPrice: number
  minimumIncrement: number
  currency: string
  endTime: string
  participantCount: number
  totalBids: number
  status: "live" | "ending_soon" | "ended"
  images: string[]
  seller: string
  category: string
  timeRemaining: number
}

interface LiveAuctionRoomProps {
  auctionId: string
  onBack: () => void
}

export default function LiveAuctionRoom({ auctionId, onBack }: LiveAuctionRoomProps) {
  const { user } = useAuth()
  const [auction, setAuction] = useState<AuctionData>({
    id: auctionId,
    title: "Vintage Art Collection",
    description: "Rare vintage art pieces from the 19th century including paintings, sculptures, and decorative items.",
    currentBid: 7500,
    startPrice: 5000,
    minimumIncrement: 100,
    currency: "USD",
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    participantCount: 24,
    totalBids: 47,
    status: "live",
    images: ["/placeholder.svg?height=400&width=600&text=Vintage+Art+Collection"],
    seller: "Art Gallery NYC",
    category: "Art & Collectibles",
    timeRemaining: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  })

  const [bidAmount, setBidAmount] = useState(auction.currentBid + auction.minimumIncrement)
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([
    {
      id: "1",
      amount: 7500,
      bidder: "Anonymous Bidder",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isWinning: true,
      isYourBid: false,
    },
    {
      id: "2",
      amount: 7200,
      bidder: "You",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isWinning: false,
      isYourBid: true,
    },
    {
      id: "3",
      amount: 7000,
      bidder: "Art Collector",
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      isWinning: false,
      isYourBid: false,
    },
  ])

  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [bidError, setBidError] = useState("")
  const [isWatching, setIsWatching] = useState(false)
  const [showBidConfirmation, setShowBidConfirmation] = useState(false)
  const [recentActivity, setRecentActivity] = useState<string[]>([])

  const bidHistoryRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<HTMLDivElement>(null)

  // WebSocket connection for real-time updates
  const { isConnected, connectionStatus, sendMessage } = useWebSocket(`ws://localhost:3001/auction/${auctionId}`, {
    onMessage: (message) => {
      switch (message.type) {
        case "bid_update":
          handleBidUpdate(message.data)
          break
        case "auction_ending":
          setAuction((prev) => ({ ...prev, status: "ending_soon" }))
          break
        case "auction_ended":
          setAuction((prev) => ({ ...prev, status: "ended" }))
          break
        case "participant_joined":
          setAuction((prev) => ({ ...prev, participantCount: prev.participantCount + 1 }))
          addActivity(`New participant joined the auction`)
          break
        case "bid_confirmation":
          setIsPlacingBid(false)
          setShowBidConfirmation(true)
          setTimeout(() => setShowBidConfirmation(false), 3000)
          break
      }
    },
    onConnect: () => {
      console.log("Connected to auction room")
      // Join the auction room
      sendMessage({
        type: "join_auction",
        data: { auctionId, userId: user?.id },
      })
    },
    onDisconnect: () => {
      console.log("Disconnected from auction room")
    },
  })

  // Handle bid updates from WebSocket
  const handleBidUpdate = (data: any) => {
    const newBid: BidHistory = {
      id: Date.now().toString(),
      amount: data.newBid,
      bidder: data.bidder === user?.email ? "You" : data.bidder,
      timestamp: data.timestamp,
      isWinning: true,
      isYourBid: data.bidder === user?.email,
    }

    setBidHistory((prev) => {
      const updated = prev.map((bid) => ({ ...bid, isWinning: false }))
      return [newBid, ...updated].slice(0, 20) // Keep last 20 bids
    })

    setAuction((prev) => ({
      ...prev,
      currentBid: data.newBid,
      totalBids: prev.totalBids + 1,
    }))

    setBidAmount(data.newBid + auction.minimumIncrement)
    addActivity(`New bid: $${data.newBid.toLocaleString()} by ${newBid.bidder}`)
  }

  // Add activity to recent activity feed
  const addActivity = (activity: string) => {
    setRecentActivity((prev) => [activity, ...prev].slice(0, 10))
  }

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const endTime = new Date(auction.endTime).getTime()
      const remaining = endTime - now

      if (remaining <= 0) {
        setAuction((prev) => ({ ...prev, status: "ended", timeRemaining: 0 }))
        clearInterval(timer)
      } else {
        setAuction((prev) => ({ ...prev, timeRemaining: remaining }))

        // Mark as ending soon if less than 5 minutes
        if (remaining <= 5 * 60 * 1000 && auction.status === "live") {
          setAuction((prev) => ({ ...prev, status: "ending_soon" }))
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [auction.endTime, auction.status])

  // Auto-scroll bid history
  useEffect(() => {
    if (bidHistoryRef.current) {
      bidHistoryRef.current.scrollTop = 0
    }
  }, [bidHistory])

  // Auto-scroll activity feed
  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = 0
    }
  }, [recentActivity])

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: auction.currency,
    }).format(amount)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handlePlaceBid = async () => {
    setBidError("")

    // Validation
    if (bidAmount < auction.currentBid + auction.minimumIncrement) {
      setBidError(`Minimum bid is ${formatCurrency(auction.currentBid + auction.minimumIncrement)}`)
      return
    }

    if (auction.status !== "live" && auction.status !== "ending_soon") {
      setBidError("This auction has ended")
      return
    }

    setIsPlacingBid(true)

    // Send bid through WebSocket
    const success = sendMessage({
      type: "place_bid",
      data: {
        auctionId: auction.id,
        amount: bidAmount,
        userId: user?.id,
        userEmail: user?.email,
      },
    })

    if (!success) {
      setIsPlacingBid(false)
      setBidError("Connection error. Please try again.")
    }
  }

  const handleQuickBid = (increment: number) => {
    setBidAmount(auction.currentBid + increment)
  }

  const getStatusColor = () => {
    switch (auction.status) {
      case "live":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "ending_soon":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse"
      case "ended":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-corporate-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Auction</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus === "connected" ? "Live" : "Connecting..."}
              </span>
            </div>

            {/* Auction Status */}
            <Badge className={getStatusColor()}>
              {auction.status === "ending_soon" ? "ENDING SOON" : auction.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Auction Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Item */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video relative">
                  <img
                    src={auction.images[0] || "/placeholder.svg"}
                    alt={auction.title}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={getStatusColor()}>
                      {auction.status === "ending_soon" ? "ENDING SOON" : "LIVE"}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/90 hover:bg-white"
                      onClick={() => setIsWatching(!isWatching)}
                    >
                      <Heart className={`w-4 h-4 ${isWatching ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{auction.title}</h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{auction.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Seller: {auction.seller}</span>
                        <span>•</span>
                        <span>Category: {auction.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Bid Display */}
                  <div className="bg-gradient-to-r from-corporate-50 to-blue-50 dark:from-corporate-900/30 dark:to-blue-900/30 p-6 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Bid</p>
                        <p className="text-3xl font-bold text-corporate-600 dark:text-corporate-400">
                          {formatCurrency(auction.currentBid)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Remaining</p>
                        <p
                          className={`text-2xl font-bold ${
                            auction.status === "ending_soon" ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {auction.status === "ended" ? "ENDED" : formatTimeRemaining(auction.timeRemaining)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Bids</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{auction.totalBids}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bidding Section */}
                  {auction.status !== "ended" && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Number(e.target.value))}
                            placeholder="Enter bid amount"
                            className="text-lg"
                            min={auction.currentBid + auction.minimumIncrement}
                            step={auction.minimumIncrement}
                          />
                        </div>
                        <Button
                          onClick={handlePlaceBid}
                          disabled={isPlacingBid || !isConnected}
                          className="bg-corporate-600 hover:bg-corporate-700 px-8"
                          size="lg"
                        >
                          {isPlacingBid ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Placing Bid...
                            </div>
                          ) : (
                            <>
                              <Gavel className="w-4 h-4 mr-2" />
                              Place Bid
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Quick Bid Buttons */}
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleQuickBid(auction.minimumIncrement)}>
                          +{formatCurrency(auction.minimumIncrement)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickBid(auction.minimumIncrement * 2)}
                        >
                          +{formatCurrency(auction.minimumIncrement * 2)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickBid(auction.minimumIncrement * 5)}
                        >
                          +{formatCurrency(auction.minimumIncrement * 5)}
                        </Button>
                      </div>

                      {bidError && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {bidError}
                        </div>
                      )}

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Minimum bid: {formatCurrency(auction.currentBid + auction.minimumIncrement)}
                      </p>
                    </div>
                  )}

                  {/* Bid Confirmation */}
                  {showBidConfirmation && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
                      <div className="flex items-center text-green-800 dark:text-green-300">
                        <Zap className="w-5 h-5 mr-2" />
                        <span className="font-medium">Bid placed successfully!</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Auction Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Auction Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Participants</span>
                  <span className="font-medium">{auction.participantCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Bids</span>
                  <span className="font-medium">{auction.totalBids}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Starting Price</span>
                  <span className="font-medium">{formatCurrency(auction.startPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Increment</span>
                  <span className="font-medium">{formatCurrency(auction.minimumIncrement)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bid History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Bid History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={bidHistoryRef} className="space-y-3 max-h-64 overflow-y-auto">
                  {bidHistory.map((bid) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        bid.isWinning
                          ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                          : bid.isYourBid
                            ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{bid.bidder.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{formatCurrency(bid.amount)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {bid.bidder} • {formatTime(bid.timestamp)}
                          </p>
                        </div>
                      </div>
                      {bid.isWinning && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Winning
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={activityRef} className="space-y-2 max-h-48 overflow-y-auto">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      {activity}
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
