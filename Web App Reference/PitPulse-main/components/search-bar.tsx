import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin } from "lucide-react"

export function SearchBar() {
  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-stretch border-2 rounded-lg sm:rounded-full overflow-hidden bg-background">
        <div className="flex items-center flex-1 px-4">
          <Search className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />
          <Input
            placeholder="Search venues, bands, or events..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>
        <div className="flex">
          <Button
            variant="ghost"
            className="rounded-none border-t sm:border-t-0 sm:border-l h-12 px-4 flex-1 justify-center"
          >
            <MapPin className="h-5 w-5 mr-2" />
            <span>Near Me</span>
          </Button>
          <Button className="rounded-none bg-purple-600 hover:bg-purple-700 h-12 px-6 flex-1 justify-center">
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
