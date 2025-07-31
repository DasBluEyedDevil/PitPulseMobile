import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Music, Star, Ticket } from "lucide-react"
import { VenueCard } from "@/components/venue-card"
import { BandCard } from "@/components/band-card"
import { UserStats } from "@/components/user-stats"
import { SearchBar } from "@/components/search-bar"
import { RecentActivity } from "@/components/recent-activity"
import { Plus, User, Bell } from "lucide-react"
import { MobileNav } from "@/components/mobile-nav"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-black text-white border-b border-zinc-800">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <MobileNav />
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Music className="h-6 w-6 text-purple-500" />
              <span>PitPulse</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/venues">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                Venues
              </Button>
            </Link>
            <Link href="/bands">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                Bands
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                Discover
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                Profile
              </Button>
            </Link>
            <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
              <MapPin className="mr-2 h-4 w-4" />
              Check In
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Bell className="h-6 w-6 text-white" />
          </Button>
        </div>
      </header>

      <main className="flex-1 container px-4 py-6 pb-20 md:pb-6">
        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Nearby Venues</h2>
                <Link href="/venues">
                  <Button variant="link">View All</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <VenueCard
                  name="The Fillmore"
                  image="/placeholder.svg?height=200&width=400"
                  rating={4.7}
                  reviewCount={342}
                  address="1805 Geary Blvd, San Francisco, CA"
                  distance="0.8 mi"
                />
                <VenueCard
                  name="Great American Music Hall"
                  image="/placeholder.svg?height=200&width=400"
                  rating={4.5}
                  reviewCount={218}
                  address="859 O'Farrell St, San Francisco, CA"
                  distance="1.2 mi"
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Upcoming Shows</h2>
                <Button variant="link">View All</Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src="/placeholder.svg?height=150&width=400"
                        alt="Concert poster"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                        Tonight
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg">Arctic Monkeys</h3>
                      <p className="text-sm text-muted-foreground">The Fillmore • 8:00 PM</p>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm">4.8 (126 reviews)</span>
                        </div>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Ticket className="mr-1 h-4 w-4" />
                          Tickets
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src="/placeholder.svg?height=150&width=400"
                        alt="Concert poster"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                        Tomorrow
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg">Tame Impala</h3>
                      <p className="text-sm text-muted-foreground">Great American Music Hall • 9:00 PM</p>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm">4.9 (203 reviews)</span>
                        </div>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Ticket className="mr-1 h-4 w-4" />
                          Tickets
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Top Rated Bands</h2>
                <Link href="/bands">
                  <Button variant="link">View All</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <BandCard
                  name="Radiohead"
                  image="/placeholder.svg?height=200&width=400"
                  rating={4.9}
                  reviewCount={1245}
                  genre="Alternative Rock"
                />
                <BandCard
                  name="The Killers"
                  image="/placeholder.svg?height=200&width=400"
                  rating={4.8}
                  reviewCount={987}
                  genre="Indie Rock"
                />
              </div>
            </section>
          </div>

          <div className="space-y-6 order-first md:order-last">
            <UserStats
              username="rockfan92"
              level={12}
              reviewCount={47}
              badgeCount={15}
              recentBadge={{
                name: "Night Owl",
                description: "Attended 5 shows that started after 10pm",
                icon: "🦉",
              }}
            />

            <div className="md:block hidden">
              <RecentActivity />
            </div>

            <Card className="md:block hidden">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-3">Badges to Unlock</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">
                      🔥
                    </div>
                    <div>
                      <p className="font-medium">Hot Streak</p>
                      <p className="text-sm text-muted-foreground">Attend 3 shows in one week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">
                      🌎
                    </div>
                    <div>
                      <p className="font-medium">Globetrotter</p>
                      <p className="text-sm text-muted-foreground">Review venues in 5 different cities</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">
                      🎸
                    </div>
                    <div>
                      <p className="font-medium">Genre Explorer</p>
                      <p className="text-sm text-muted-foreground">Review bands from 10 different genres</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-zinc-900 text-zinc-400 py-6 border-t border-zinc-800">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Music className="h-5 w-5 text-purple-500" />
              <span className="font-bold text-white">PitPulse</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white">
                About
              </Link>
              <Link href="#" className="hover:text-white">
                Privacy
              </Link>
              <Link href="#" className="hover:text-white">
                Terms
              </Link>
              <Link href="#" className="hover:text-white">
                Help
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center md:text-left text-sm">© 2025 PitPulse. All rights reserved.</div>
        </div>
      </footer>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-10">
        <div className="grid grid-cols-5 h-16">
          <Link href="/" className="flex flex-col items-center justify-center text-zinc-400 hover:text-white">
            <Music className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/venues" className="flex flex-col items-center justify-center text-zinc-400 hover:text-white">
            <MapPin className="h-5 w-5" />
            <span className="text-xs mt-1">Venues</span>
          </Link>
          <Link href="/check-in" className="flex flex-col items-center justify-center">
            <div className="bg-purple-600 rounded-full w-12 h-12 flex items-center justify-center -mt-4">
              <Plus className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/bands" className="flex flex-col items-center justify-center text-zinc-400 hover:text-white">
            <Music className="h-5 w-5" />
            <span className="text-xs mt-1">Bands</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center justify-center text-zinc-400 hover:text-white">
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
