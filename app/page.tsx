"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, ExternalLink, Edit2, Trash2, Moon, Sun, Type, Image, X, Star, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { OfflineToast } from "@/components/offline-toast"

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
  const [selectedFont, setSelectedFont] = useState("mono")
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

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration)
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError)
          })
      })
    }
  }, [])

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load data from localStorage on mount
  useEffect(() => {
    if (mounted) {
      const savedLinks = localStorage.getItem("linkManager_links")
      const savedFont = localStorage.getItem("linkManager_font")

      if (savedLinks) {
        try {
          setLinks(JSON.parse(savedLinks))
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

  const generateFavicon = async (url: string) => {
    setIsGeneratingIcon(true)
    try {
      // Try to get the domain from the URL
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
      const domain = urlObj.hostname
      
      // Try multiple favicon sources
      const faviconSources = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        `https://${domain}/favicon.ico`,
        `https://${domain}/favicon.png`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`
      ]
      
      // Test the first source (Google's favicon service is most reliable)
      const faviconUrl = faviconSources[0]
      
      // Test if the favicon loads
      const img = new window.Image()
      img.onload = () => {
        setNewLinkIcon(faviconUrl)
        setShowIcon(true)
      }
      img.onerror = () => {
        // If Google's service fails, try DuckDuckGo
        const fallbackImg = new window.Image()
        fallbackImg.onload = () => {
          setNewLinkIcon(faviconSources[3])
          setShowIcon(true)
        }
        fallbackImg.onerror = () => {
          console.warn("Could not load favicon for", domain)
          setShowIcon(false)
          setNewLinkIcon("")
        }
        fallbackImg.src = faviconSources[3]
      }
      img.src = faviconUrl
    } catch (error) {
      console.error("Error generating favicon:", error)
      setShowIcon(false)
      setNewLinkIcon("")
    } finally {
      setIsGeneratingIcon(false)
    }
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

    setLinks((prev) => [...prev, newLink])
    setNewLinkUrl("")
    setNewLinkName("")
    setNewLinkIcon("")
    setShowIcon(false)
    setIsAddDialogOpen(false)
  }

  const updateLink = () => {
    if (!editingLink || !newLinkUrl.trim() || !newLinkName.trim()) return

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
    setNewLinkIcon("")
    setShowIcon(false)
  }

  const closeAddDialog = () => {
    setNewLinkUrl("")
    setNewLinkName("")
    setNewLinkIcon("")
    setShowIcon(false)
    setIsAddDialogOpen(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  const currentFontClass = FONT_OPTIONS.find((font) => font.value === selectedFont)?.className || "font-mono"

  // Sort links: starred first, then by order
  const sortedLinks = [...links].sort((a, b) => {
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return (a.order || 0) - (b.order || 0)
  })

  if (!mounted) {
    return null
  }

  return (
    <>
      <OfflineToast />
      <div className={`min-h-screen bg-background transition-colors duration-700 ${currentFontClass}`}>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Link Manager</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Organize and manage your favorite links</p>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
              {/* Font Selector */}
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
                              <img 
                                src={newLinkIcon} 
                                alt="Favicon" 
                                className="w-4 h-4 rounded-sm"
                                onError={() => {
                                  setShowIcon(false)
                                  setNewLinkIcon("")
                                }}
                              />
                              <span className="text-sm text-muted-foreground hidden sm:inline">Icon loaded</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0"
                                onClick={() => {
                                  setShowIcon(false)
                                  setNewLinkIcon("")
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => newLinkUrl && generateFavicon(newLinkUrl)}
                            disabled={!newLinkUrl || isGeneratingIcon}
                            className="gap-2 text-xs sm:text-sm"
                          >
                            <Image className="h-4 w-4" />
                            <span className="hidden sm:inline">{isGeneratingIcon ? "Generating..." : "Generate Icon"}</span>
                            <span className="inline sm:hidden">{isGeneratingIcon ? "..." : "Icon"}</span>
                          </Button>
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

          {/* Links Grid */}
          {sortedLinks.length === 0 ? (
            <Card className="text-center py-8 sm:py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <ExternalLink className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No links yet</h3>
                  <p className="text-sm sm:text-base">Add your first link to get started organizing your collection.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {sortedLinks.map((link) => (
                <Card 
                  key={link.id} 
                  className={`group hover:shadow-md transition-all cursor-move ${
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate mr-2 min-w-0 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        {link.iconUrl && (
                          <img 
                            src={link.iconUrl} 
                            alt="Site icon" 
                            className="w-4 h-4 rounded-sm flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="truncate">{link.displayName}</span>
                        {link.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 sm:h-8 sm:w-8 ${
                            link.starred ? 'text-yellow-500 hover:text-yellow-600' : 'hover:text-yellow-500'
                          }`}
                          onClick={() => toggleStar(link.id)}
                          aria-label={`${link.starred ? 'Unstar' : 'Star'} ${link.displayName}`}
                        >
                          <Star className={`h-3 w-3 ${link.starred ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => openEditDialog(link)}
                          aria-label={`Edit ${link.displayName}`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteLink(link.id)}
                          aria-label={`Delete ${link.displayName}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group/link"
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
                          <img 
                            src={newLinkIcon} 
                            alt="Favicon" 
                            className="w-4 h-4 rounded-sm"
                            onError={() => {
                              setShowIcon(false)
                              setNewLinkIcon("")
                            }}
                          />
                          <span className="text-sm text-muted-foreground hidden sm:inline">Icon loaded</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={() => {
                              setShowIcon(false)
                              setNewLinkIcon("")
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => newLinkUrl && generateFavicon(newLinkUrl)}
                        disabled={!newLinkUrl || isGeneratingIcon}
                        className="gap-2 text-xs sm:text-sm"
                      >
                        <Image className="h-4 w-4" />
                        <span className="hidden sm:inline">{isGeneratingIcon ? "Generating..." : "Generate Icon"}</span>
                        <span className="inline sm:hidden">{isGeneratingIcon ? "..." : "Icon"}</span>
                      </Button>
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

          {/* Stats */}
          {sortedLinks.length > 0 && (
            <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
              Managing {sortedLinks.length} {sortedLinks.length === 1 ? "link" : "links"}
              {sortedLinks.filter(link => link.starred).length > 0 && (
                <span className="ml-2">
                  • {sortedLinks.filter(link => link.starred).length} starred
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
} 