"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  userId?: string
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError, reconnectAttempts = 5, reconnectInterval = 3000 } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  const ws = useRef<WebSocket | null>(null)
  const reconnectCount = useRef(0)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      setConnectionStatus("connecting")

      // For demo purposes, we'll simulate WebSocket connection
      // In production, replace with actual WebSocket URL
      const mockWs = {
        readyState: 1, // OPEN
        send: (data: string) => {
          console.log("Mock WebSocket send:", data)
          // Simulate server response for demo
          setTimeout(() => {
            const response: WebSocketMessage = {
              type: "bid_confirmation",
              data: { success: true, message: "Bid placed successfully" },
              timestamp: new Date().toISOString(),
            }
            setLastMessage(response)
            onMessage?.(response)
          }, 100)
        },
        close: () => {
          setIsConnected(false)
          setConnectionStatus("disconnected")
        },
        addEventListener: (event: string, handler: any) => {
          // Mock event listeners
        },
        removeEventListener: (event: string, handler: any) => {
          // Mock event listeners
        },
      } as any

      ws.current = mockWs
      setIsConnected(true)
      setConnectionStatus("connected")
      reconnectCount.current = 0
      onConnect?.()

      // Simulate periodic bid updates for demo
      const interval = setInterval(() => {
        if (ws.current && isConnected) {
          const mockBidUpdate: WebSocketMessage = {
            type: "bid_update",
            data: {
              auctionId: "auction-1",
              newBid: Math.floor(Math.random() * 1000) + 5000,
              bidder: "Anonymous Bidder",
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          }
          setLastMessage(mockBidUpdate)
          onMessage?.(mockBidUpdate)
        }
      }, 10000) // Update every 10 seconds for demo

      return () => clearInterval(interval)
    } catch (error) {
      console.error("WebSocket connection error:", error)
      setConnectionStatus("error")
      onError?.(error as Event)

      if (reconnectCount.current < reconnectAttempts) {
        reconnectCount.current++
        reconnectTimer.current = setTimeout(connect, reconnectInterval)
      }
    }
  }, [onMessage, onConnect, onDisconnect, onError, reconnectAttempts, reconnectInterval, isConnected])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }

    if (ws.current) {
      ws.current.close()
      ws.current = null
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
    onDisconnect?.()
  }, [onDisconnect])

  const sendMessage = useCallback(
    (message: Omit<WebSocketMessage, "timestamp">) => {
      if (ws.current && isConnected) {
        const fullMessage: WebSocketMessage = {
          ...message,
          timestamp: new Date().toISOString(),
        }
        ws.current.send(JSON.stringify(fullMessage))
        return true
      }
      return false
    },
    [isConnected],
  )

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  }
}
