import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy } from "lucide-react"

interface UserStatsProps {
  username: string
  level: number
  reviewCount: number
  badgeCount: number
  recentBadge: {
    name: string
    description: string
    icon: string
  }
}

export function UserStats({ username, level, reviewCount, badgeCount, recentBadge }: UserStatsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <img
              src="/placeholder.svg?height=48&width=48"
              alt={username}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold">{username}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Trophy className="h-3 w-3 mr-1" />
              <span>Level {level}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>
          <Progress value={65} className="h-2" />
          <div className="text-xs text-center text-muted-foreground mt-1">2,340 XP to next level</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{reviewCount}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{badgeCount}</div>
            <div className="text-xs text-muted-foreground">Badges</div>
          </div>
        </div>

        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Recently Earned Badge</div>
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">
              {recentBadge.icon}
            </div>
            <div>
              <p className="font-medium">{recentBadge.name}</p>
              <p className="text-xs text-muted-foreground">{recentBadge.description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
