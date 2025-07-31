import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, Star, Music, Ticket, Share2, BookmarkPlus, Calendar } from "lucide-react"
import { BandReviewForm } from "@/components/band-review-form"
import { ReviewCard } from "@/components/review-card"

export default function BandDetailPage() {
  return (
    <div className="container px-4 py-6">
      <Link href="/bands" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Bands
      </Link>

      <div className="relative rounded-lg overflow-hidden mb-6">
        <img
          src="/placeholder.svg?height=400&width=1200"
          alt="Arctic Monkeys"
          className="w-full h-64 md:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-600">TOP RATED</Badge>
            <Badge variant="outline" className="text-white border-white">
              INDIE ROCK
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Arctic Monkeys</h1>
          <div className="flex items-center text-white gap-4">
            <div className="flex items-center">
              <Music className="h-4 w-4 mr-1" />
              <span className="text-sm">Indie Rock, Alternative</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm">4.8 (1,245 reviews)</span>
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
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Follow
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
              <TabsTrigger value="shows">Upcoming Shows</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">About Arctic Monkeys</h2>
                  <p className="mb-6">
                    Arctic Monkeys are an English rock band formed in Sheffield in 2002. The group consists of Alex
                    Turner (lead vocals, guitar), Jamie Cook (guitar), Nick O'Malley (bass guitar), and Matt Helders
                    (drums). Former band member Andy Nicholson left the band in 2006 shortly after their debut album was
                    released.
                  </p>
                  <p className="mb-6">
                    They have released seven studio albums: Whatever People Say I Am, That's What I'm Not (2006),
                    Favourite Worst Nightmare (2007), Humbug (2009), Suck It and See (2011), AM (2013), Tranquility Base
                    Hotel & Casino (2018), and The Car (2022). Their debut album was the fastest-selling debut album in
                    British music history.
                  </p>

                  <h3 className="text-xl font-bold mb-3">Performance Ratings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Fun Factor</span>
                        <span className="text-sm font-medium">4.9/5</span>
                      </div>
                      <Progress value={98} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Crowd Engagement</span>
                        <span className="text-sm font-medium">4.7/5</span>
                      </div>
                      <Progress value={94} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Sound Quality</span>
                        <span className="text-sm font-medium">4.8/5</span>
                      </div>
                      <Progress value={96} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Set List</span>
                        <span className="text-sm font-medium">4.6/5</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Stage Presence</span>
                        <span className="text-sm font-medium">4.9/5</span>
                      </div>
                      <Progress value={98} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Stage Production</span>
                        <span className="text-sm font-medium">4.5/5</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-3">Popular Songs</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white">
                          1
                        </div>
                        <span>Do I Wanna Know?</span>
                      </div>
                      <span className="text-sm text-muted-foreground">4:32</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white">
                          2
                        </div>
                        <span>R U Mine?</span>
                      </div>
                      <span className="text-sm text-muted-foreground">3:21</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white">
                          3
                        </div>
                        <span>505</span>
                      </div>
                      <span className="text-sm text-muted-foreground">4:13</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white">
                          4
                        </div>
                        <span>Why'd You Only Call Me When You're High?</span>
                      </div>
                      <span className="text-sm text-muted-foreground">2:41</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white">
                          5
                        </div>
                        <span>I Wanna Be Yours</span>
                      </div>
                      <span className="text-sm text-muted-foreground">3:04</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Reviews (1,245)</h2>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Star className="mr-2 h-4 w-4" />
                      Write Review
                    </Button>
                  </div>

                  <BandReviewForm />

                  <div className="space-y-4 mt-8">
                    <ReviewCard
                      username="rockfan92"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 days ago"
                      rating={5}
                      content="Saw them at The Fillmore and they absolutely killed it! Alex Turner's voice was perfect and the energy was incredible. They played all their hits and the crowd was going wild. Can't wait to see them again!"
                      ratings={{
                        funFactor: 5,
                        crowdEngagement: 5,
                        soundQuality: 5,
                        setList: 5,
                        stagePresence: 5,
                        stageProduction: 4,
                      }}
                      likes={42}
                    />
                    <ReviewCard
                      username="musiclover45"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="1 week ago"
                      rating={4}
                      content="Great show at Madison Square Garden. The band was tight and played a good mix of new and old songs. Only complaint was that it was a bit short - would have loved to hear a few more songs from their earlier albums."
                      ratings={{
                        funFactor: 4,
                        crowdEngagement: 4,
                        soundQuality: 5,
                        setList: 3,
                        stagePresence: 5,
                        stageProduction: 4,
                      }}
                      likes={28}
                    />
                    <ReviewCard
                      username="concertjunkie"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 weeks ago"
                      rating={5}
                      content="One of the best live bands I've ever seen. Their performance at Coachella was mind-blowing. Alex Turner is such a charismatic frontman and the whole band was incredibly tight. The light show was also spectacular!"
                      ratings={{
                        funFactor: 5,
                        crowdEngagement: 5,
                        soundQuality: 4,
                        setList: 5,
                        stagePresence: 5,
                        stageProduction: 5,
                      }}
                      likes={56}
                    />
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">Load More Reviews</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shows">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Upcoming Shows</h2>

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
                                    ? "The Fillmore, San Francisco"
                                    : i === 2
                                      ? "Hollywood Bowl, Los Angeles"
                                      : i === 3
                                        ? "Madison Square Garden, New York"
                                        : "Red Rocks Amphitheatre, Colorado"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {i === 1
                                    ? "With special guest Alexandra Savior"
                                    : i === 2
                                      ? "The Car Tour"
                                      : i === 3
                                        ? "Summer Festival Series"
                                        : "Acoustic Set"}
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
                                      ? "Venue rating: 4.7 (342 reviews)"
                                      : i === 2
                                        ? "Venue rating: 4.8 (512 reviews)"
                                        : i === 3
                                          ? "Venue rating: 4.9 (876 reviews)"
                                          : "Venue rating: 4.9 (654 reviews)"}
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
                    <Button variant="outline">View All Shows</Button>
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
                          alt={`Band photo ${i + 1}`}
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
              <h3 className="font-bold text-lg mb-3">Top Venues Played</h3>
              <div className="space-y-3">
                {[
                  "The Fillmore, San Francisco",
                  "Madison Square Garden, New York",
                  "O2 Arena, London",
                  "Red Rocks, Colorado",
                ].map((venue, i) => (
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
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-muted-foreground">
                          {4.5 + i * 0.1} ({100 + i * 50} reviews)
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
              <h3 className="font-bold text-lg mb-3">Badges to Earn</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🎸</div>
                  <div>
                    <p className="font-medium">Arctic Superfan</p>
                    <p className="text-sm text-muted-foreground">See Arctic Monkeys live 3 times</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🌟</div>
                  <div>
                    <p className="font-medium">Indie Rock Aficionado</p>
                    <p className="text-sm text-muted-foreground">Review 10 indie rock bands</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🎤</div>
                  <div>
                    <p className="font-medium">Frontman Fanatic</p>
                    <p className="text-sm text-muted-foreground">Rate stage presence 5/5 for 5 different bands</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Similar Bands</h3>
              <div className="space-y-3">
                {["The Strokes", "Tame Impala", "Franz Ferdinand", "The Killers"].map((band, i) => (
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
                          {4.5 + i * 0.1} ({100 + i * 50} reviews)
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
        </div>
      </div>
    </div>
  )
}
