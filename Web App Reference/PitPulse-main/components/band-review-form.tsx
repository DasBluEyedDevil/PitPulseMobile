import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Star } from "lucide-react"

export function BandReviewForm() {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-4">Write a Review</h3>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Star key={rating} className="h-6 w-6 cursor-pointer text-muted hover:text-yellow-500" />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Tap to rate</span>
      </div>

      <Textarea placeholder="Share your experience seeing this band..." className="mb-4" />

      <div className="space-y-4 mb-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Fun Factor</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Crowd Engagement</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Sound Quality</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Set List</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Stage Presence</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm">Stage Production</label>
            <span className="text-sm">3/5</span>
          </div>
          <Slider defaultValue={[60]} max={100} step={20} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" className="mr-2">
          Cancel
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700">Submit Review</Button>
      </div>
    </div>
  )
}
