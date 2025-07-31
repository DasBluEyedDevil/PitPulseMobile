import { Card, CardContent } from "@/components/ui/card"
import { Star, Music } from "lucide-react"
import Link from "next/link"

interface BandCardProps {
  name: string
  image: string
  rating: number
  reviewCount: number
  genre: string
}

export function BandCard({ name, image, rating, reviewCount, genre }: BandCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link href="/bands/arctic-monkeys" className="absolute inset-0 z-10">
        <span className="sr-only">View {name}</span>
      </Link>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-1/3">
            <img src={image || "/placeholder.svg"} alt={name} className="w-full h-40 sm:h-full object-cover" />
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
              <Music className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{genre}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
