import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star, Shield, Zap, Globe, Smartphone, Monitor } from "lucide-react"

export const metadata: Metadata = {
  title: 'Link Manager',
  description: 'Organise all of your links in one place.',
  keywords: 'about link manager, bookmark organizer features, link management benefits, bookmark tool, link, bookmark',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Link Manager
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">About Link Manager</h1>
          <p className="text-muted-foreground text-lg">
            A powerful, privacy-focused tool for organizing and managing your favorite websites and bookmarks.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your data never leaves your device. All links are stored locally in your browser, 
                ensuring complete privacy and security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Lightning Fast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Instant search, quick access, and responsive design make managing 
                hundreds of links effortless and enjoyable.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Import & Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Seamlessly import bookmarks from any browser and export your collections 
                to share across devices or backup your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Smart Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Star important links, search by name or URL, and organize everything 
                with intelligent categorization and filtering.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Device Support */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cross-Platform Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Monitor className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Desktop Browsers</h3>
                  <p className="text-muted-foreground text-sm">
                    Full feature support including browser bookmark import/export. 
                    Works perfectly on Chrome, Firefox, Safari, and Edge.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Mobile Devices</h3>
                  <p className="text-muted-foreground text-sm">
                    Responsive design optimized for touch. App export/import works fully, 
                    browser bookmark features available on desktop only.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Add Your Links</h3>
                  <p className="text-muted-foreground text-sm">
                    Manually add links or import your existing browser bookmarks to get started quickly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Organize & Star</h3>
                  <p className="text-muted-foreground text-sm">
                    Star your favorites, add custom icons, and use the search function to find links instantly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Access Anywhere</h3>
                  <p className="text-muted-foreground text-sm">
                    Export your collection to backup or share across devices. Your organized links travel with you.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Link href="/">
            <Button size="lg" className="gap-2">
              Start Organizing Your Links
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 