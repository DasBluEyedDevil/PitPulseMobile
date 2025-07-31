import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapPin, Calendar, Star, Ticket, ChevronLeft, Share2, BookmarkPlus, ThumbsUp } from "lucide-react"
import { VenueReviewForm } from "@/components/venue-review-form"
import { ReviewCard } from "@/components/review-card"

export default function VenueDetailPage() {
  return (
    <div className="container px-4 py-6">
      <Link href="/venues" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Venues
      </Link>

      <div className="relative rounded-lg overflow-hidden mb-6">
        <img
          src="/placeholder.svg?height=400&width=1200"
          alt="The Fillmore"
          className="w-full h-64 md:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-600">POPULAR</Badge>
            <Badge variant="outline" className="text-white border-white">
              HISTORIC
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">The Fillmore</h1>
          <div className="flex items-center text-white gap-4">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">1805 Geary Blvd, San Francisco, CA</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm">4.7 (342 reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Star className="mr-2 h-4 w-4" />
          Write Review
        </Button>
        <Button variant="outline">
          <MapPin className="mr-2 h-4 w-4" />
          Check In
        </Button>
        <Button variant="outline">
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <Tabs defaultValue="about">
            <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">About The Fillmore</h2>
                  <p className="mb-6">
                    The Fillmore is a historic music venue located in San Francisco, California. Originally opened in
                    1912, it became famous in the 1960s when concert promoter Bill Graham began booking rock bands
                    there. The venue has hosted countless legendary performers and continues to be one of the city's
                    premier concert venues.
                  </p>

                  <h3 className="text-xl font-bold mb-3">Venue Ratings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Acoustics</span>
                        <span className="text-sm font-medium">4.8/5</span>
                      </div>
                      <Progress value={96} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Cleanliness</span>
                        <span className="text-sm font-medium">4.5/5</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Staff</span>
                        <span className="text-sm font-medium">4.6/5</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Accessibility</span>
                        <span className="text-sm font-medium">4.2/5</span>
                      </div>
                      <Progress value={84} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Layout</span>
                        <span className="text-sm font-medium">4.7/5</span>
                      </div>
                      <Progress value={94} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Value</span>
                        <span className="text-sm font-medium">4.3/5</span>
                      </div>
                      <Progress value={86} className="h-2" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Bar Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Coat Check</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Merchandise</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Food Options</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Wheelchair Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Parking Nearby</span>
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden h-64">
                    <img
                      src="/placeholder.svg?height=300&width=800"
                      alt="Map location"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Reviews (342)</h2>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Star className="mr-2 h-4 w-4" />
                      Write Review
                    </Button>
                  </div>

                  <VenueReviewForm />

                  <div className="space-y-4 mt-8">
                    <ReviewCard
                      username="rockfan92"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 days ago"
                      rating={5}
                      content="Absolutely amazing venue! The acoustics are perfect and the staff was incredibly friendly. Saw Tame Impala here and it was one of the best concert experiences I've ever had."
                      ratings={{
                        acoustics: 5,
                        cleanliness: 4,
                        staff: 5,
                        accessibility: 4,
                        layout: 5,
                      }}
                      likes={24}
                    />
                    <ReviewCard
                      username="concertlover45"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="1 week ago"
                      rating={4}
                      content="Great venue with a lot of history. Sound quality was excellent and the layout allows for good views from almost anywhere. Only downside was the long lines for drinks."
                      ratings={{
                        acoustics: 5,
                        cleanliness: 4,
                        staff: 3,
                        accessibility: 4,
                        layout: 4,
                      }}
                      likes={18}
                    />
                    <ReviewCard
                      username="musicjunkie"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 weeks ago"
                      rating={5}
                      content="The Fillmore is legendary for a reason. The sound is incredible, the posters are iconic, and they even give you an apple on the way out! Saw Radiohead here and it was unforgettable."
                      ratings={{
                        acoustics: 5,
                        cleanliness: 5,
                        staff: 5,
                        accessibility: 4,
                        layout: 5,
                      }}
                      likes={42}
                    />
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">Load More Reviews</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>

                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row">
                            <div className="md:w-1/4 relative">
                              <img
                                src="/placeholder.svg?height=150&width=200"
                                alt="Event poster"
                                className="w-full h-40 md:h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                {i === 1 ? "Tonight" : `Jun ${10 + i}`}
                              </div>
                            </div>
                            <div className="p-4 md:w-3/4 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-lg">
                                  {i === 1
                                    ? "Arctic Monkeys"
                                    : i === 2
                                      ? "Tame Impala"
                                      : i === 3
                                        ? "The Strokes"
                                        : "Vampire Weekend"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {i === 1
                                    ? "With special guest Alexandra Savior"
                                    : i === 2
                                      ? "Slow Rush Tour"
                                      : i === 3
                                        ? "The New Abnormal Tour"
                                        : "Father of the Bride Tour"}
                                </p>
                                <div className="flex items-center text-sm mb-4">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>
                                    {i === 1
                                      ? "Tonight • 8:00 PM"
                                      : i === 2
                                        ? "Jun 12 • 9:00 PM"
                                        : i === 3
                                          ? "Jun 15 • 8:30 PM"
                                          : "Jun 18 • 8:00 PM"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                  <span className="text-sm">
                                    {i === 1
                                      ? "4.8 (126 reviews)"
                                      : i === 2
                                        ? "4.9 (203 reviews)"
                                        : i === 3
                                          ? "4.7 (98 reviews)"
                                          : "4.6 (87 reviews)"}
                                  </span>
                                </div>
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                                  <Ticket className="mr-1 h-4 w-4" />
                                  Tickets
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">View All Events</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Photos</h2>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={`/placeholder.svg?height=300&width=300&text=Photo ${i + 1}`}
                          alt={`Venue photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">Load More Photos</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Popular Bands Here</h3>
              <div className="grid grid-cols-2 gap-3">
                {["Radiohead", "Arctic Monkeys", "Tame Impala", "The Strokes"].map((band, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img
                        src={`/placeholder.svg?height=40&width=40`}
                        alt={band}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{band}</p>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-muted-foreground">
                          {4.5 + i * 0.1} ({100 + i * 50})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2">
                View All
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Badges to Earn Here</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🎵</div>
                  <div>
                    <p className="font-medium">Fillmore Fanatic</p>
                    <p className="text-sm text-muted-foreground">Check in to 5 shows at The Fillmore</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🌉</div>
                  <div>
                    <p className="font-medium">SF Explorer</p>
                    <p className="text-sm text-muted-foreground">Visit 3 different venues in San Francisco</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🏆</div>
                  <div>
                    <p className="font-medium">Critic's Choice</p>
                    <p className="text-sm text-muted-foreground">Write 10 detailed venue reviews</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Similar Venues</h3>
              <div className="space-y-3">
                {["Great American Music Hall", "The Warfield", "The Independent"].map((venue, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded overflow-hidden">
                      <img
                        src={`/placeholder.svg?height=40&width=40`}
                        alt={venue}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{venue}</p>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="text-xs text-muted-foreground">{1 + i * 0.5} mi away</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2">
                View All
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
