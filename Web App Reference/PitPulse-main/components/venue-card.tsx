import { Card, CardContent } from "@/components/ui/card"
import { Star, MapPin } from "lucide-react"
import Link from "next/link"

interface VenueCardProps {
  name: string
  image: string
  rating: number
  reviewCount: number
  address: string
  distance?: string
}

export function VenueCard({ name, image, rating, reviewCount, address, distance }: VenueCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link href="/venues/the-fillmore" className="absolute inset-0 z-10">
        <span className="sr-only">View {name}</span>
      </Link>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-1/3">
            <img src={image || "/placeholder.svg"} alt={name} className="w-full h-40 sm:h-full object-cover" />
            {distance && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                {distance}
              </div>
            )}
          </div>
          <div className="p-4 sm:w-2/3">
            <h3 className="font-bold text-lg">{name}</h3>
            <div className="flex items-center mt-1 mb-2">
              <Star className="h-4 w-4 text-yellow-500 mr-1 flex-shrink-0" />
              <span className="text-sm">
                {rating} ({reviewCount} reviews)
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
