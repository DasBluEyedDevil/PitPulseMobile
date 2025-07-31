import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin } from "lucide-react"

export function RecentActivity() {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-3">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">musiclover45</span> reviewed
                <span className="font-medium"> Arctic Monkeys</span>
              </p>
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">concertjunkie</span> checked in at
                <span className="font-medium"> The Fillmore</span>
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>San Francisco, CA</span>
              </div>
              <p className="text-xs text-muted-foreground">5 hours ago</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>TJ</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">rockstar87</span> reviewed
                <span className="font-medium"> Great American Music Hall</span>
              </p>
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-yellow-500" />
                <Star className="h-3 w-3 text-muted" />
              </div>
              <p className="text-xs text-muted-foreground">Yesterday</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>KL</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">livemusicfan</span> earned the
                <span className="font-medium"> Venue Veteran</span> badge
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>🏆 Visit 10 different venues</span>
              </div>
              <p className="text-xs text-muted-foreground">2 days ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
