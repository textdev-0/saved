"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Plus, ExternalLink, Edit2, Trash2, Moon, Sun, Type, Image, X, Star, GripVertical, Upload, Zap, BookOpen, Github, Twitter, Youtube, Globe, Lightbulb, ChevronDown, Search, Download, FileUp, Loader2, FileX2, Check, XCircle, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"

// Manual CRC64 implementation using ISO polynomial (0x42F0E1EBA9EA3693)
// Based on the algorithm from https://www.sunshine2k.de/articles/coding/crc/understanding_crc.html
function crc64(data: string): string {
  // CRC64-ISO polynomial: 0x42F0E1EBA9EA3693
  // Using a simplified polynomial for performance: 0x42F0E1EBA9EA3693
  const POLY = BigInt('0x42F0E1EBA9EA3693')
  const INIT = BigInt('0xFFFFFFFFFFFFFFFF')
  const XOROUT = BigInt('0xFFFFFFFFFFFFFFFF')
  
  let crc = INIT
  const bytes = new TextEncoder().encode(data)
  
  for (let i = 0; i < bytes.length; i++) {
    crc = crc ^ BigInt(bytes[i])
    
    for (let j = 0; j < 8; j++) {
      if (crc & BigInt(1)) {
        crc = (crc >> BigInt(1)) ^ POLY
      } else {
        crc = crc >> BigInt(1)
      }
    }
  }
  
  return ((crc ^ XOROUT) & BigInt('0xFFFFFFFFFFFFFFFF')).toString(16).toUpperCase().padStart(16, '0')
}

interface Link {
  id: string
  url: string
  displayName: string
  iconUrl?: string
  starred?: boolean
  order?: number
}

const FONT_OPTIONS = [
  { value: "Monospace", label: "Monospace", className: "font-mono" },
  { value: "Sans Serif", label: "Sans Serif", className: "font-sans" },
  { value: "Serif", label: "Serif", className: "font-serif" },
]

export default function LinkManager() {
  const [links, setLinks] = useState<Link[]>([])
  const [selectedFont, setSelectedFont] = useState("Monospace")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinkName, setNewLinkName] = useState("")
  const [newLinkIcon, setNewLinkIcon] = useState("")
  const [showIcon, setShowIcon] = useState(false)
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [loadingIcons, setLoadingIcons] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "unstarred">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const tabSwitcherRef = useRef<HTMLDivElement>(null)
  const [tabSwitcherWidth, setTabSwitcherWidth] = useState<number>(0)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<"all" | "starred" | "unstarred">("all")
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const fileDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const importDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showImportHelp, setShowImportHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle hydration and device detection
  useEffect(() => {
    setMounted(true)
    
    // Detect if device is mobile
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen))
    }
    
    checkIsMobile()
    
    // Re-check on resize
    const handleResize = () => {
      checkIsMobile()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load data from localStorage on mount
  useEffect(() => {
    if (mounted) {
      const savedLinks = localStorage.getItem("linkManager_links")
      const savedFont = localStorage.getItem("linkManager_font")

      if (savedLinks) {
        try {
          const parsedLinks = JSON.parse(savedLinks)
          setLinks(parsedLinks)
          
          // Set loading state for all links with external icon URLs
          const linksWithExternalIcons = parsedLinks.filter((link: Link) => 
            link.iconUrl && !link.iconUrl.startsWith('data:')
          )
          if (linksWithExternalIcons.length > 0) {
            setLoadingIcons(new Set(linksWithExternalIcons.map((link: Link) => link.id)))
          }
        } catch (error) {
          console.error("Error parsing saved links:", error)
        }
      }

      if (savedFont) {
        setSelectedFont(savedFont)
      }
    }
  }, [mounted])

  // Save links to localStorage whenever links change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("linkManager_links", JSON.stringify(links))
    }
  }, [links, mounted])

  // Save font preference to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("linkManager_font", selectedFont)
    }
  }, [selectedFont, mounted])

  // Update search bar width when tab switcher size changes
  useEffect(() => {
    if (!tabSwitcherRef.current) return

    const updateWidth = () => {
      if (tabSwitcherRef.current) {
        setTabSwitcherWidth(tabSwitcherRef.current.offsetWidth)
      }
    }

    // Initial width calculation
    updateWidth()

    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(tabSwitcherRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [mounted, links, loadingIcons]) // Re-run when links or loading state changes

  const generateFavicon = async (url: string) => {
    setIsGeneratingIcon(true)
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
      const domain = urlObj.hostname
      
      // Comprehensive favicon fetching with 5 free fallback sources
      // This approach mirrors how production apps like Dashy handle favicon fetching
      // Each service has different strengths and coverage areas
      const faviconSources = [
        {
          name: "Google",
          url: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          description: "Google's favicon API"
        },
        {
          name: "DuckDuckGo", 
          url: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
          description: "DuckDuckGo icon service"
        },
        {
          name: "Yandex",
          url: `https://favicon.yandex.net/favicon/${domain}`,
          description: "Yandex favicon service"
        },
        {
          name: "Direct",
          url: `https://${domain}/favicon.ico`,
          description: "Direct domain favicon"
        },
        {
          name: "Direct PNG",
          url: `https://${domain}/favicon.png`, 
          description: "Direct domain PNG favicon"
        }
      ]
      
      const tryFaviconSource = (sourceIndex: number): Promise<string | null> => {
        return new Promise((resolve) => {
          if (sourceIndex >= faviconSources.length) {
            resolve(null)
            return
          }
          
          const source = faviconSources[sourceIndex]
          let resolved = false
          
          // Update status message if it's a fallback
          if (sourceIndex > 0) {
            setNewLinkIcon(`Trying fallback (${sourceIndex}/5)...`)
            setShowIcon(true)
          }
          
          const testImg = document.createElement('img')
          
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              testImg.onload = null
              testImg.onerror = null
              tryFaviconSource(sourceIndex + 1).then(resolve)
            }
          }, 2000) // 2 second timeout per source
          
          testImg.onload = () => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeoutId)
              resolve(source.url)
            }
          }
          testImg.onerror = () => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeoutId)
              tryFaviconSource(sourceIndex + 1).then(resolve)
            }
          }
          
          testImg.src = source.url
        })
      }
      
      const result = await tryFaviconSource(0)
      
      if (result) {
        setNewLinkIcon(result)
        setShowIcon(true)
        setIsGeneratingIcon(false)
      } else {
        console.warn("Could not load favicon for", domain, "- tried all sources")
        setShowIcon(false)
        setNewLinkIcon("")
        setIsGeneratingIcon(false)
      }
      
    } catch (error) {
      console.error("Error generating favicon:", error)
      setShowIcon(false)
      setNewLinkIcon("")
      setIsGeneratingIcon(false)
    }
  }

  const handleCustomIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    // Clear the timeout since dialog is closed
    if (fileDialogTimeoutRef.current) {
      clearTimeout(fileDialogTimeoutRef.current)
      fileDialogTimeoutRef.current = null
    }
    
    setIsFileDialogOpen(false) // Dialog closed (file selected or cancelled)
    
    if (!file) {
      setIsUploadingIcon(false)
      return
    }

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, etc.)')
      setIsUploadingIcon(false)
      return
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2MB')
      setIsUploadingIcon(false)
      return
    }

    // Clean up old icon if it was a data URL
    if (showIcon && newLinkIcon?.startsWith('data:')) {
      console.log('Replaced custom icon with new upload')
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) {
        setNewLinkIcon(dataUrl)
        setShowIcon(true)
      }
      setIsUploadingIcon(false)
    }
    reader.onerror = () => {
      alert('Error reading the file. Please try again.')
      setIsUploadingIcon(false)
    }
    reader.readAsDataURL(file)
  }

  const handleFileDialogOpen = () => {
    setIsFileDialogOpen(true)
    setIsUploadingIcon(true)
    
    // Clear any existing timeout
    if (fileDialogTimeoutRef.current) {
      clearTimeout(fileDialogTimeoutRef.current)
    }
    
    // Set a timeout to detect if dialog was cancelled - always clear loading state
    fileDialogTimeoutRef.current = setTimeout(() => {
      setIsFileDialogOpen(false)
      setIsUploadingIcon(false)
      fileDialogTimeoutRef.current = null
    }, 3000) // 3 second timeout
  }

  const addLink = () => {
    if (!newLinkUrl.trim() || !newLinkName.trim()) return

    const newLink: Link = {
      id: Date.now().toString(),
      url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`,
      displayName: newLinkName,
      starred: false,
      order: links.length,
      ...(showIcon && newLinkIcon ? { iconUrl: newLinkIcon } : {})
    }

    // Set loading state for icons that aren't data URLs (uploaded images)
    if (showIcon && newLinkIcon && !newLinkIcon.startsWith('data:')) {
      setLoadingIcons(prev => new Set(prev).add(newLink.id))
    }

    setLinks((prev) => [...prev, newLink])
    setNewLinkUrl("")
    setNewLinkName("")
    setNewLinkIcon("")
    setShowIcon(false)
    setIsAddDialogOpen(false)
  }

  const updateLink = () => {
    if (!editingLink || !newLinkUrl.trim() || !newLinkName.trim()) return

    // Set loading state for new icons that aren't data URLs (uploaded images)
    if (showIcon && newLinkIcon && !newLinkIcon.startsWith('data:') && newLinkIcon !== editingLink.iconUrl) {
      setLoadingIcons(prev => new Set(prev).add(editingLink.id))
    }

    setLinks((prev) =>
      prev.map((link) =>
        link.id === editingLink.id
          ? {
              ...link,
              url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`,
              displayName: newLinkName,
              ...(showIcon && newLinkIcon ? { iconUrl: newLinkIcon } : { iconUrl: undefined })
            }
          : link,
      ),
    )
    setEditingLink(null)
    setNewLinkUrl("")
    setNewLinkName("")
    setNewLinkIcon("")
    setShowIcon(false)
  }

  const deleteLink = (id: string) => {
    // Clean up any data URL icons before deletion to prevent storage bloat
    const linkToDelete = links.find(link => link.id === id)
    if (linkToDelete?.iconUrl?.startsWith('data:')) {
      // This was a custom uploaded icon - it's now being cleaned up automatically
      console.log('Cleaned up custom icon for deleted link:', linkToDelete.displayName)
    }
    
    setLinks((prev) => prev.filter((link) => link.id !== id))
  }

  const toggleStar = (id: string) => {
    setLinks((prev) => 
      prev.map((link) => 
        link.id === id 
          ? { ...link, starred: !link.starred }
          : link
      )
    )
  }

  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    setDraggedItem(linkId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, linkId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(linkId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    setLinks((prev) => {
      const draggedIndex = prev.findIndex(link => link.id === draggedItem)
      const targetIndex = prev.findIndex(link => link.id === targetId)
      
      if (draggedIndex === -1 || targetIndex === -1) return prev
      
      const newLinks = [...prev]
      const [removed] = newLinks.splice(draggedIndex, 1)
      newLinks.splice(targetIndex, 0, removed)
      
      // Update order
      return newLinks.map((link, index) => ({ ...link, order: index }))
    })
    
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const openEditDialog = (link: Link) => {
    setEditingLink(link)
    setNewLinkUrl(link.url)
    setNewLinkName(link.displayName)
    setNewLinkIcon(link.iconUrl || "")
    setShowIcon(!!link.iconUrl)
  }

  const closeEditDialog = () => {
    setEditingLink(null)
    setNewLinkUrl("")
    setNewLinkName("")
    clearIcon()
  }
  

  const closeAddDialog = () => {
    setNewLinkUrl("")
    setNewLinkName("")
    clearIcon()
    setIsAddDialogOpen(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  const currentFontClass = FONT_OPTIONS.find((font) => font.value === selectedFont)?.className || "font-mono"

  // Filter and sort links based on active tab and search
  const filteredLinks = links.filter((link) => {
    // First apply tab filter
    let passesTabFilter = true
    if (activeTab === "starred") passesTabFilter = !!link.starred
    if (activeTab === "unstarred") passesTabFilter = !link.starred
    
    // Then apply search filter if there's a query
    let passesSearchFilter = true
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      passesSearchFilter = (
        link.displayName.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query)
      )
    }
    
    return passesTabFilter && passesSearchFilter
  })

  const sortedLinks = [...filteredLinks].sort((a, b) => {
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return (a.order || 0) - (b.order || 0)
  })

  const clearIcon = () => {
    // Clean up data URL if it was a custom uploaded icon
    if (showIcon && newLinkIcon?.startsWith('data:')) {
      console.log('Manually removed custom icon')
    }
    setShowIcon(false)
    setNewLinkIcon("")
  }

  const getStorageInfo = () => {
    try {
      const linksData = localStorage.getItem("linkManager_links")
      if (!linksData) return { size: 0, customIcons: 0 }
      
      const sizeInBytes = new Blob([linksData]).size
      const sizeInKB = Math.round(sizeInBytes / 1024 * 10) / 10
      
      // Count custom icons (data URLs)
      const customIcons = links.filter(link => link.iconUrl?.startsWith('data:')).length
      
      return { size: sizeInKB, customIcons }
    } catch {
      return { size: 0, customIcons: 0 }
    }
  }

  const addSampleLink = (url: string, name: string, iconUrl?: string, starred: boolean = false) => {
    const newLink: Link = {
      id: Date.now().toString(),
      url: url.startsWith("http") ? url : `https://${url}`,
      displayName: name,
      starred: starred,
      order: links.length,
      ...(iconUrl ? { iconUrl } : {})
    }

    // Set loading state for external icon URLs
    if (iconUrl && !iconUrl.startsWith('data:')) {
      setLoadingIcons(prev => new Set(prev).add(newLink.id))
    }

    setLinks((prev) => [...prev, newLink])
  }

  const getLinkCRC64 = (link: Link): string => {
    // Only hash the actual content, not dynamic fields like id/order
    const contentObject = {
      displayName: link.displayName,
      iconUrl: link.iconUrl || null, // normalize undefined to null for consistency
      starred: link.starred || false, // normalize undefined to false
      url: link.url,
    };
    const linkJson = JSON.stringify(contentObject);
    return crc64(linkJson).toUpperCase();
  };

  // Delete all functionality
  const handleDeleteAll = () => {
    let linksToDelete: Link[] = []
    
    switch (deleteType) {
      case "all":
        linksToDelete = links
        break
      case "starred":
        linksToDelete = links.filter(link => link.starred)
        break
      case "unstarred":
        linksToDelete = links.filter(link => !link.starred)
        break
    }
    
    if (linksToDelete.length === 0) {
      alert(`No ${deleteType === "all" ? "links" : deleteType} to delete`)
      setDeleteDialogOpen(false)
      return
    }
    
    // Remove the links
    const idsToDelete = new Set(linksToDelete.map(link => link.id))
    setLinks(prev => prev.filter(link => !idsToDelete.has(link.id)))
    setDeleteDialogOpen(false)
    alert(`Deleted ${linksToDelete.length} ${deleteType === "all" ? "links" : deleteType}`)
  }

  // Export bookmarks to HTML file (Netscape bookmark format)
  const exportBookmarks = async () => {
    setIsExporting(true)
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const bookmarkHTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}">Link Manager Export</H3>
    <DL><p>
${links.map(link => {
  const addDate = Math.floor(Date.now() / 1000)
  const starred = link.starred ? ' STARRED="true"' : ''
  const icon = link.iconUrl ? ` ICON="${link.iconUrl}"` : ''
  return `        <DT><A HREF="${link.url}" ADD_DATE="${addDate}"${icon}${starred}>${link.displayName}</A>`
}).join('\n')}
    </DL><p>
</DL><p>`

      // Create and download the file
      const blob = new Blob([bookmarkHTML], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `link-manager-bookmarks-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  // Import bookmarks from HTML file
  const handleImportBookmarks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    // Clear the timeout since dialog is closed
    if (importDialogTimeoutRef.current) {
      clearTimeout(importDialogTimeoutRef.current)
      importDialogTimeoutRef.current = null
    }
    
    setIsImportDialogOpen(false) // Dialog closed (file selected or cancelled)
    
    if (!file) {
      setIsImporting(false)
      return
    }

    try {
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      
      // Find all bookmark links
      const bookmarkElements = doc.querySelectorAll('a[href]')
      const importedLinks: Link[] = []
      
      bookmarkElements.forEach((element) => {
        const url = element.getAttribute('href')
        const displayName = element.textContent || ''
        const starred = element.getAttribute('starred') === 'true' || element.getAttribute('STARRED') === 'true'
        const iconUrl = element.getAttribute('icon') || element.getAttribute('ICON') || undefined
        
        if (url && displayName) {
          // Check if link already exists
          const existingLink = links.find(link => link.url === url)
          if (!existingLink) {
            importedLinks.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              url,
              displayName,
              starred,
              iconUrl,
              order: links.length + importedLinks.length
            })
          }
        }
      })
      
      if (importedLinks.length > 0) {
        setLinks(prev => [...prev, ...importedLinks])
        // Set loading icons for external URLs
        const externalIcons = importedLinks.filter(link => link.iconUrl && !link.iconUrl.startsWith('data:'))
        if (externalIcons.length > 0) {
          setLoadingIcons(prev => {
            const newSet = new Set(prev)
            externalIcons.forEach(link => newSet.add(link.id))
            return newSet
          })
        }
        alert(`Successfully imported ${importedLinks.length} new links!`)
      } else {
        alert('No new links to import (all links already exist or no valid links found)')
      }
    } catch (error) {
      console.error('Error importing bookmarks:', error)
      alert('Error importing bookmarks. Please ensure the file is a valid HTML bookmarks file.')
    } finally {
      setIsImporting(false)
    }
    
    // Reset the input
    event.target.value = ''
  }

  const handleImportDialogOpen = () => {
    setIsImportDialogOpen(true)
    setIsImporting(true)
    
    // Clear any existing timeout
    if (importDialogTimeoutRef.current) {
      clearTimeout(importDialogTimeoutRef.current)
    }
    
    // Set a timeout to detect if dialog was cancelled - always clear loading state
    importDialogTimeoutRef.current = setTimeout(() => {
      setIsImportDialogOpen(false)
      setIsImporting(false)
      importDialogTimeoutRef.current = null
    }, 3000) // 3 second timeout
  }

  if (!mounted) {
    return null
  }

  return (
    <>
      <div className={`min-h-screen bg-background transition-colors duration-700 ${currentFontClass}`}>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl 2xl:max-w-none 2xl:max-w-[1600px]">
        {/* Header */}
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Link Manager</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Organize and manage your favorite links</p>
          </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
            {/* Font Selector */}
              <div className="relative">
            <Select value={selectedFont} onValueChange={setSelectedFont}>
                  <SelectTrigger className="w-[120px] sm:w-[140px]" aria-label="Select font">
                <Type className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value} className={font.className}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Add Link Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                  <Button className="gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">Add Link</span>
                    <span className="inline xs:hidden">Add</span>
                </Button>
              </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Add New Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="add-url">URL</Label>
                    <Input
                      id="add-url"
                      placeholder="https://example.com"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, addLink)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-name">Display Name</Label>
                    <Input
                      id="add-name"
                      placeholder="My Awesome Link"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, addLink)}
                      className="mt-1"
                    />
                  </div>
                    
                    {/* Icon Section */}
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <div className="flex items-center gap-2">
                        {showIcon && newLinkIcon ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-2 py-1 border rounded-md">
                              {newLinkIcon.startsWith('Trying fallback') ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">{newLinkIcon}</span>
                                </>
                              ) : (
                                <>
                                  <img 
                                    src={newLinkIcon} 
                                    alt="Favicon" 
                                    className="w-4 h-4 rounded-sm"
                                    onError={() => {
                                      // Icon failed to load, remove it
                                      setShowIcon(false)
                                      setNewLinkIcon("")
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground hidden sm:inline">Icon loaded</span>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0"
                                onClick={clearIcon}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => newLinkUrl && generateFavicon(newLinkUrl)}
                                                        disabled={!newLinkUrl || isGeneratingIcon}
                          className="gap-2 text-xs sm:text-sm"
                        >
                          {isGeneratingIcon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">{isGeneratingIcon ? "Generating..." : "Generate Icon"}</span>
                          <span className="inline sm:hidden">{isGeneratingIcon ? "..." : "Icon"}</span>
                            </Button>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCustomIcon}
                                onClick={handleFileDialogOpen}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id="add-custom-icon"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs sm:text-sm"
                                                            asChild
                          >
                            <label htmlFor="add-custom-icon" className="cursor-pointer flex items-center gap-2">
                              {isUploadingIcon ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              <span className="hidden sm:inline">Upload</span>
                                </label>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={closeAddDialog}>
                      Cancel
                    </Button>
                    <Button onClick={addLink} disabled={!newLinkUrl.trim() || !newLinkName.trim()}>
                      Add Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
                      </div>
          </div>
        </div>

        {/* Tab Switcher & Search - Merged */}
        {links.length > 0 && (
          <div className="flex flex-col items-center mb-6">
            <div className="bg-muted rounded-lg p-1 border border-muted-foreground/30">
              {/* Tab Switcher */}
              <div 
                ref={tabSwitcherRef}
                className="inline-flex items-center"
              >
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({links.length})
                </button>
                <button
                  onClick={() => setActiveTab("starred")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === "starred"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Starred ({links.filter(link => link.starred).length})
                </button>
                <button
                  onClick={() => setActiveTab("unstarred")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === "unstarred"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unstarred ({links.filter(link => !link.starred).length})
                </button>
              </div>
              
              {/* Subtle divider */}
              <div className="h-px bg-muted-foreground/30 mx-1 my-1"></div>
              
              {/* Search Bar - seamlessly merged */}
              <div className="flex items-center gap-3 px-4 py-2">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search links by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground text-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-background/50 transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Links Grid */}
        {links.length === 0 ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Main Empty State Card */}
              <Card className="text-center py-12 sm:py-16 bg-gradient-to-br from-background to-muted/20 border-dashed border-2">
                <CardContent className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl transform -translate-y-4"></div>
                    <div className="relative bg-primary/10 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center">
                      <ExternalLink className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">Welcome to Link Manager!</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
                      Start building your personal link collection. Organize your favorite websites, tools, and resources in one place.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-foreground border"
                      onClick={() => {
                        const details = document.getElementById('additional-details')
                        if (details) {
                          details.style.display = details.style.display === 'none' ? 'block' : 'none'
                        }
                      }}
                    >
                      Also... <ChevronDown className="h-4 w-4" />
                    </Button>
                    <div id="additional-details" style={{display: 'none'}} className="space-y-3">
                                          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                        You can Export your links to use another device. 
                        Importing also works from your browsers existing Bookmarks!
                      </p>
                      <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                        Don't worry, the links never leave your device. Nothing is "Uploaded" to a web server, only to your device. The only web interaction is to get a websites icon.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)}
                      size="lg"
                      className="gap-2 px-6 sm:px-8"
                    >
                      <Plus className="h-5 w-5" />
                      Add Your First Link
                    </Button>
                    <Button variant="outline" size="lg" className="gap-2" onClick={() => {
                      const quickLinks = [
                        { url: "https://github.com", name: "GitHub", icon: "https://www.google.com/s2/favicons?domain=github.com&sz=64", starred: true },
                        { url: "https://google.com", name: "Google", icon: "https://www.google.com/s2/favicons?domain=google.com&sz=64", starred: false },
                        { url: "https://youtube.com", name: "YouTube", icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64", starred: false }
                      ]
                      quickLinks.forEach((link, index) => {
                        setTimeout(() => addSampleLink(link.url, link.name, link.icon, link.starred), index * 100)
                      })
                    }}>
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Sample Links</span>
                      <span className="inline sm:hidden">Samples</span>
                    </Button>
                  </div>
                  
                  <div className="flex justify-center items-center gap-2 pt-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".html"
                        onChange={handleImportBookmarks}
                        onClick={handleImportDialogOpen}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="starter-import-bookmarks"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        asChild
                        disabled={isImporting}
                      >
                        <label htmlFor="starter-import-bookmarks" className="cursor-pointer flex items-center gap-2">
                          {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileUp className="h-4 w-4" />
                          )}
                          <span className="text-sm">Or import your bookmarks</span>
                        </label>
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground p-1 h-auto border border-muted-foreground/30"
                        onClick={() => setShowImportHelp(!showImportHelp)}
                      >
                        How?
                      </Button>
                      
                      {showImportHelp && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowImportHelp(false)}
                          />
                          <div className="absolute top-full mt-2 right-0 z-50 w-80 p-4 bg-background border rounded-lg shadow-lg">
                            {isMobile ? (
                              <>
                                <h4 className="font-semibold mb-3 text-sm">Mobile Browser Limitations:</h4>
                                <div className="text-xs space-y-2 text-muted-foreground">
                                  <p><strong>⚠️ Browser bookmark export is not available on mobile devices.</strong></p>
                                  <p>However, the app's export/import feature still works perfectly:</p>
                                  <ul className="ml-4 space-y-1 list-disc">
                                    <li>Export your links using the "Export" button</li>
                                    <li>Import previously exported link files</li>
                                    <li>Share collections between devices</li>
                                  </ul>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                                  Use desktop browser for bookmark export/import
                                </p>
                              </>
                            ) : (
                              <>
                                <h4 className="font-semibold mb-3 text-sm">Export bookmarks from your browser:</h4>
                                <ol className="text-xs space-y-2 text-muted-foreground">
                                  <li><strong>1.</strong> Press <code className="bg-muted px-1 rounded">Ctrl+Shift+O</code> (or <code className="bg-muted px-1 rounded">Cmd+Shift+O</code> on Mac)</li>
                                  <li><strong>2.</strong> Look for three dots <strong>⋮</strong> or a menu button</li>
                                  <li><strong>3.</strong> Click <strong>"Export"</strong> or <strong>"Import and Backup"</strong> → <strong>"Export"</strong></li>
                                  <li><strong>4.</strong> Save the HTML file</li>
                                  <li><strong>5.</strong> Click import above and select that file</li>
                                </ol>
                                <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                                  Works with Chrome, Firefox, Safari, and Edge
                                </p>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
              </div>
            </CardContent>
          </Card>
            </div>
          ) : sortedLinks.length === 0 ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="relative">
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">No results found</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? (
                      <>No links match "<span className="font-medium">{searchQuery}</span>"</>
                    ) : (
                      <>No links in the {activeTab === "starred" ? "starred" : "unstarred"} category</>
                    )}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
              {sortedLinks.map((link) => (
                <Card 
                  key={link.id} 
                  className={`group hover:shadow-md transition-all cursor-move min-h-[120px] w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] 2xl:w-[calc(20%-19.2px)] ${
                    draggedItem === link.id ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverItem === link.id ? 'border-primary border-2' : ''
                  } ${
                    link.starred ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, link.id)}
                  onDragOver={(e) => handleDragOver(e, link.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, link.id)}
                  onDragEnd={handleDragEnd}
                >
                  <CardHeader className="pb-0 relative">
                    <div className="absolute top-8 left-6">
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <CardTitle className="text-sm sm:text-base pl-6">
                      <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                        {(link.iconUrl || loadingIcons.has(link.id)) && (
                          <div className="w-4 h-4 flex-shrink-0 relative">
                            {loadingIcons.has(link.id) && (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                            {link.iconUrl && (
                              <img 
                                src={link.iconUrl} 
                                alt="Site icon" 
                                className="w-4 h-4 rounded-sm"
                                onLoad={() => {
                                  setLoadingIcons(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(link.id)
                                    return newSet
                                  })
                                }}
                                onError={(e) => {
                                  // Icon failed to load, hide it and remove from data
                                  e.currentTarget.style.display = 'none'
                                  setLoadingIcons(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(link.id)
                                    return newSet
                                  })
                                  setLinks(prev => prev.map(l => 
                                    l.id === link.id ? { ...l, iconUrl: undefined } : l
                                  ))
                                }}
                                style={{ display: loadingIcons.has(link.id) ? 'none' : 'block' }}
                              />
                            )}
                          </div>
                        )}
                        <span className="truncate">{link.displayName}</span>
                        {link.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardTitle>
                    <div className="relative mt-1 h-8">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                          size="sm"
                          className={`h-8 px-1.5 text-xs ${
                            link.starred ? 'text-yellow-500 hover:text-yellow-600' : 'hover:text-yellow-500'
                          }`}
                          onClick={() => toggleStar(link.id)}
                          aria-label={`${link.starred ? 'Unstar' : 'Star'} ${link.displayName}`}
                        >
                          <Star className={`h-4 w-4 mr-1 ${link.starred ? 'fill-current' : ''}`} />
                          Star
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-1.5 text-xs"
                        onClick={() => openEditDialog(link)}
                        aria-label={`Edit ${link.displayName}`}
                      >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                      </Button>
                      <Button
                        variant="ghost"
                          size="sm"
                          className="h-8 px-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => deleteLink(link.id)}
                        aria-label={`Delete ${link.displayName}`}
                      >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                      </Button>
                    </div>
                      <div className="absolute inset-0 flex items-end justify-start pb-0 pl-6 text-base text-muted-foreground opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                        <span>#{getLinkCRC64(link)}</span>
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-start gap-2 group/link pl-6"
                  >
                    <span className="truncate">{link.url}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingLink} onOpenChange={(open) => !open && closeEditDialog()}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Edit Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-url">URL</Label>
                <Input
                  id="edit-url"
                  placeholder="https://example.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, updateLink)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Display Name</Label>
                <Input
                  id="edit-name"
                  placeholder="My Awesome Link"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, updateLink)}
                  className="mt-1"
                />
              </div>

                {/* Icon Section */}
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-2">
                    {showIcon && newLinkIcon ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-2 py-1 border rounded-md">
                          {newLinkIcon.startsWith('Trying fallback') ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{newLinkIcon}</span>
                            </>
                          ) : (
                            <>
                              <img 
                                src={newLinkIcon} 
                                alt="Favicon" 
                                className="w-4 h-4 rounded-sm"
                                onError={() => {
                                  // Icon failed to load, remove it
                                  setShowIcon(false)
                                  setNewLinkIcon("")
                                }}
                              />
                              <span className="text-sm text-muted-foreground hidden sm:inline">Icon loaded</span>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={clearIcon}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => newLinkUrl && generateFavicon(newLinkUrl)}
                          disabled={!newLinkUrl || isGeneratingIcon}
                          className="gap-2 text-xs sm:text-sm"
                        >
                          {isGeneratingIcon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">{isGeneratingIcon ? "Generating..." : "Generate Icon"}</span>
                          <span className="inline sm:hidden">{isGeneratingIcon ? "..." : "Icon"}</span>
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomIcon}
                            onClick={handleFileDialogOpen}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="edit-custom-icon"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs sm:text-sm"
                            asChild
                          >
                            <label htmlFor="edit-custom-icon" className="cursor-pointer flex items-center gap-2">
                              {isUploadingIcon ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              <span className="hidden sm:inline">Upload</span>
                            </label>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button onClick={updateLink} disabled={!newLinkUrl.trim() || !newLinkName.trim()}>
                  Update Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Delete Links</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-type">Select what to delete</Label>
                  <Select value={deleteType} onValueChange={(value) => setDeleteType(value as "all" | "starred" | "unstarred")}>
                    <SelectTrigger id="delete-type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Links ({links.length})</SelectItem>
                      <SelectItem value="starred">Starred ({links.filter(l => l.starred).length})</SelectItem>
                      <SelectItem value="unstarred">Unstarred ({links.filter(l => !l.starred).length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Warning:</strong> This action cannot be undone. 
                    {deleteType === "all" && ` All ${links.length} links will be permanently deleted.`}
                    {deleteType === "starred" && ` All ${links.filter(l => l.starred).length} favourite links will be permanently deleted.`}
                    {deleteType === "unstarred" && ` All ${links.filter(l => !l.starred).length} unstarred links will be permanently deleted.`}
                  </p>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    No, Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDeleteAll}
                    className="gap-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    <Check className="h-4 w-4" />
                    Yes, Delete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Stats and Actions */}
          <div className="mt-6 sm:mt-8 space-y-4">
            {/* Export/Import Buttons */}
            <div className="flex justify-center gap-2">
                            <Button
                variant="outline"
                size="sm"
                onClick={() => exportBookmarks()}
                className="gap-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".html"
                  onChange={handleImportBookmarks}
                  onClick={handleImportDialogOpen}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-bookmarks"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                  disabled={isImporting && !isImportDialogOpen}
                >
                  <label htmlFor="import-bookmarks" className="cursor-pointer flex items-center gap-2">
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Import
                  </label>
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <FileX2 className="h-4 w-4" />
                Delete All
              </Button>
            </div>

                    {/* Stats */}
            <div className="text-center text-xs sm:text-sm text-muted-foreground space-y-1">
            <div>
              {sortedLinks.length > 0 ? (
                <>
                  Managing {sortedLinks.length} {sortedLinks.length === 1 ? "link" : "links"}
                  {sortedLinks.filter(link => link.starred).length > 0 && (
                    <span className="ml-2">
                      • {sortedLinks.filter(link => link.starred).length} starred
                    </span>
                  )}
                </>
              ) : (
                "No links yet - start by adding your first link"
              )}
          </div>
            {(() => {
              const storageInfo = getStorageInfo()
              const totalIcons = links.length > 0 ? links.filter(link => link.iconUrl).length : 0
              const customIcons = storageInfo.customIcons
              const externalIcons = totalIcons - customIcons
              
              return (
                <div className="flex items-center justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    {isMobile ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Monitor className="h-3 w-3" />
                    )}
                    Storage: {storageInfo.size}KB
                  </span>
                  {totalIcons > 0 && (
                    <>
                      <span>•</span>
                      <span>Icons: {totalIcons} total</span>
                      {customIcons > 0 && (
                        <>
                          <span>•</span>
                          <span>{customIcons} uploaded, {externalIcons} external</span>
                        </>
                      )}
                    </>
        )}
      </div>
              )
            })()}
    </div>
            </div>
        </div>
      </div>
    </>
  )
} 
