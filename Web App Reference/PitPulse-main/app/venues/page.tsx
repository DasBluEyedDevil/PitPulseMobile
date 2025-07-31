import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Search, Filter } from "lucide-react"
import { VenueCard } from "@/components/venue-card"
import { VenueMap } from "@/components/venue-map"

export default function VenuesPage() {
  return (
    <div className="container px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Explore Venues</h1>

      <div className="flex flex-col gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search venues..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2 flex-1">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2 flex-1">
            <MapPin className="h-4 w-4" />
            Near Me
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="mb-6">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
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
            <VenueCard
              name="The Warfield"
              image="/placeholder.svg?height=200&width=400"
              rating={4.6}
              reviewCount={276}
              address="982 Market St, San Francisco, CA"
              distance="1.5 mi"
            />
            <VenueCard
              name="Bill Graham Civic Auditorium"
              image="/placeholder.svg?height=200&width=400"
              rating={4.4}
              reviewCount={189}
              address="99 Grove St, San Francisco, CA"
              distance="1.7 mi"
            />
            <VenueCard
              name="Bottom of the Hill"
              image="/placeholder.svg?height=200&width=400"
              rating={4.3}
              reviewCount={156}
              address="1233 17th St, San Francisco, CA"
              distance="2.3 mi"
            />
            <VenueCard
              name="The Independent"
              image="/placeholder.svg?height=200&width=400"
              rating={4.8}
              reviewCount={312}
              address="628 Divisadero St, San Francisco, CA"
              distance="1.9 mi"
            />
          </div>
        </TabsContent>
        <TabsContent value="map">
          <VenueMap />
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-8">
        <Button variant="outline" className="mx-auto">
          Load More
        </Button>
      </div>
    </div>
  )
}
