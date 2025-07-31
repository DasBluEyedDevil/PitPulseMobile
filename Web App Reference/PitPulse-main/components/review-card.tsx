import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ThumbsUp, MoreHorizontal } from "lucide-react"

interface ReviewCardProps {
  username: string
  avatar: string
  date: string
  rating: number
  content: string
  ratings: Record<string, number>
  likes: number
  isOwnReview?: boolean
}

export function ReviewCard({
  username,
  avatar,
  date,
  rating,
  content,
  ratings,
  likes,
  isOwnReview = false,
}: ReviewCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={avatar || "/placeholder.svg"} alt={username} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{username}</span>
                {isOwnReview && <span className="text-xs bg-muted px-2 py-0.5 rounded">You</span>}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < rating ? "fill-yellow-500 text-yellow-500" : "text-muted"}`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{date}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3">
          <p className="text-sm">{content}</p>
        </div>

        {Object.keys(ratings).length > 0 && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
            {Object.entries(ratings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-2 w-2 ${i < value ? "fill-yellow-500 text-yellow-500" : "text-muted"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
            <ThumbsUp className="h-3 w-3" />
            Helpful ({likes})
          </Button>
          {isOwnReview && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-8">
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-red-500 hover:text-red-600">
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
