"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, Home, MapPin, Music, User, Search, Bell, Settings, LogOut } from "lucide-react"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6 text-white" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
        <div className="flex flex-col h-full">
          <div className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl">
              <Music className="h-6 w-6 text-purple-500" />
              <span>PitPulse</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <img
                    src="/placeholder.svg?height=48&width=48"
                    alt="User avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold">rockfan92</h3>
                  <div className="text-sm text-muted-foreground">Level 12</div>
                </div>
              </div>

              <nav className="space-y-1">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link
                  href="/venues"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <MapPin className="h-5 w-5" />
                  <span>Venues</span>
                </Link>
                <Link
                  href="/bands"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Music className="h-5 w-5" />
                  <span>Bands</span>
                </Link>
                <Link
                  href="/search"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </Link>
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
              </nav>

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 px-3">Your Stats</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-xl font-bold">47</div>
                    <div className="text-xs text-muted-foreground">Check-ins</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-xl font-bold">15</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-4 space-y-2">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted w-full"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            <Link
              href="/logout"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted w-full text-red-500"
              onClick={() => setOpen(false)}
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
