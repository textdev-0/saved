"use client"

import { useState, useEffect } from 'react'
import { X, WifiOff } from 'lucide-react'

export function OfflineToast() {
  const [isOnline, setIsOnline] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setIsVisible(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsVisible(true)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Show toast immediately if offline
    if (!navigator.onLine) {
      setIsVisible(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isVisible || isOnline) {
    return null
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-[9999] max-w-md"
      style={{
        backgroundColor: 'rgb(252, 165, 165)', // Light red background
        border: '2px solid rgb(185, 28, 28)', // Full-opacity dark red
        color: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="flex items-start gap-3">
        <WifiOff className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'white' }} />
        <div className="flex-1">
          <p style={{ margin: 0, color: 'white' }}>
            You seem to be offline. This site will still work, but other websites and apps might not.
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 ml-2 hover:opacity-75 transition-opacity"
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '0',
            cursor: 'pointer'
          }}
          aria-label="Close offline notification"
        >
          <X className="h-5 w-5" style={{ color: 'white' }} />
        </button>
      </div>
    </div>
  )
} 