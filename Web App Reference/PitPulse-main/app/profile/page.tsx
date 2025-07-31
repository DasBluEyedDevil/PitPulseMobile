import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Settings, Star, Music, MapPin, Trophy, Edit } from "lucide-react"
import { ReviewCard } from "@/components/review-card"
import { BadgeGrid } from "@/components/badge-grid"

export default function ProfilePage() {
  return (
    <div className="container px-4 py-6">
      <div className="relative rounded-lg overflow-hidden mb-6">
        <img
          src="/placeholder.svg?height=400&width=1200"
          alt="Profile banner"
          className="w-full h-48 md:h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-muted">
              <img
                src="/placeholder.svg?height=100&width=100"
                alt="Profile avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-white">
              <Edit className="h-4 w-4" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white">rockfan92</h1>
              <Badge className="bg-purple-600 self-start">Level 12</Badge>
            </div>
            <p className="text-zinc-300 mt-1">Concert enthusiast and music lover</p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 self-start md:self-end">
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <Tabs defaultValue="activity">
            <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>

                  <div className="space-y-6">
                    <div className="border-l-2 border-purple-600 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-purple-600 rounded-full -left-[7px] top-1"></div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Check In
                          </Badge>
                          <span className="text-sm text-muted-foreground">2 days ago</span>
                        </div>
                        <p className="font-medium">Checked in at The Fillmore</p>
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Arctic Monkeys</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>San Francisco, CA</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-2 border-yellow-500 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-yellow-500 rounded-full -left-[7px] top-1"></div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                            Badge Earned
                          </Badge>
                          <span className="text-sm text-muted-foreground">3 days ago</span>
                        </div>
                        <p className="font-medium">Earned the Night Owl badge!</p>
                        <div className="flex items-center gap-2">
                          <div className="bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center text-lg">
                            🦉
                          </div>
                          <span className="text-sm">Attended 5 shows that started after 10pm</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-2 border-green-500 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[7px] top-1"></div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            Review
                          </Badge>
                          <span className="text-sm text-muted-foreground">1 week ago</span>
                        </div>
                        <p className="font-medium">Reviewed Tame Impala at Great American Music Hall</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          ))}
                        </div>
                        <p className="text-sm">
                          "Amazing show! The visuals were incredible and the sound was perfect."
                        </p>
                      </div>
                    </div>

                    <div className="border-l-2 border-blue-500 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-500 border-blue-500">
                            Level Up
                          </Badge>
                          <span className="text-sm text-muted-foreground">2 weeks ago</span>
                        </div>
                        <p className="font-medium">Reached Level 12!</p>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Keep reviewing to reach Level 13</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">View More Activity</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">My Reviews (47)</h2>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Button variant="outline" className="rounded-full">
                        All
                      </Button>
                      <Button variant="outline" className="rounded-full">
                        Venues
                      </Button>
                      <Button variant="outline" className="rounded-full">
                        Bands
                      </Button>
                    </div>

                    <ReviewCard
                      username="rockfan92"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 days ago"
                      rating={5}
                      content="Saw Arctic Monkeys at The Fillmore and they absolutely killed it! Alex Turner's voice was perfect and the energy was incredible. They played all their hits and the crowd was going wild. Can't wait to see them again!"
                      ratings={{
                        funFactor: 5,
                        crowdEngagement: 5,
                        soundQuality: 5,
                        setList: 5,
                        stagePresence: 5,
                        stageProduction: 4,
                      }}
                      likes={42}
                      isOwnReview={true}
                    />

                    <ReviewCard
                      username="rockfan92"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="1 week ago"
                      rating={5}
                      content="Great American Music Hall is such an amazing venue! The acoustics are perfect and the staff was incredibly friendly. Saw Tame Impala here and it was one of the best concert experiences I've ever had."
                      ratings={{
                        acoustics: 5,
                        cleanliness: 4,
                        staff: 5,
                        accessibility: 4,
                        layout: 5,
                      }}
                      likes={28}
                      isOwnReview={true}
                    />

                    <ReviewCard
                      username="rockfan92"
                      avatar="/placeholder.svg?height=50&width=50"
                      date="2 weeks ago"
                      rating={4}
                      content="The Strokes put on a solid show at Madison Square Garden. Julian's voice was on point and the band was tight. Only giving 4 stars because the setlist was a bit predictable, but still a great night overall."
                      ratings={{
                        funFactor: 4,
                        crowdEngagement: 4,
                        soundQuality: 5,
                        setList: 3,
                        stagePresence: 4,
                        stageProduction: 4,
                      }}
                      likes={15}
                      isOwnReview={true}
                    />
                  </div>

                  <div className="flex justify-center mt-8">
                    <Button variant="outline">Load More Reviews</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">My Badges (15)</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sort by:</span>
                      <select className="text-sm border rounded p-1">
                        <option>Recently Earned</option>
                        <option>Alphabetical</option>
                        <option>Rarity</option>
                      </select>
                    </div>
                  </div>

                  <BadgeGrid />

                  <h3 className="text-xl font-bold mt-8 mb-4">Badges to Unlock</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 flex flex-col items-center text-center gap-2">
                      <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 opacity-50">
                        🔥
                      </div>
                      <h4 className="font-bold">Hot Streak</h4>
                      <p className="text-sm text-muted-foreground">Attend 3 shows in one week</p>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Progress: 1/3</span>
                        <Progress value={33} className="h-2 mt-1" />
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 flex flex-col items-center text-center gap-2">
                      <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 opacity-50">
                        🌎
                      </div>
                      <h4 className="font-bold">Globetrotter</h4>
                      <p className="text-sm text-muted-foreground">Review venues in 5 different cities</p>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Progress: 3/5</span>
                        <Progress value={60} className="h-2 mt-1" />
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 flex flex-col items-center text-center gap-2">
                      <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 opacity-50">
                        🎸
                      </div>
                      <h4 className="font-bold">Genre Explorer</h4>
                      <p className="text-sm text-muted-foreground">Review bands from 10 different genres</p>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Progress: 6/10</span>
                        <Progress value={60} className="h-2 mt-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">My Stats</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="border rounded-lg p-4 text-center">
                      <h3 className="text-muted-foreground text-sm mb-1">Total Check-ins</h3>
                      <p className="text-3xl font-bold">47</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <h3 className="text-muted-foreground text-sm mb-1">Venues Visited</h3>
                      <p className="text-3xl font-bold">18</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <h3 className="text-muted-foreground text-sm mb-1">Bands Reviewed</h3>
                      <p className="text-3xl font-bold">29</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Top Genres</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Indie Rock</span>
                            <span className="text-sm">12 bands</span>
                          </div>
                          <Progress value={80} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Alternative</span>
                            <span className="text-sm">8 bands</span>
                          </div>
                          <Progress value={53} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Pop</span>
                            <span className="text-sm">5 bands</span>
                          </div>
                          <Progress value={33} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Electronic</span>
                            <span className="text-sm">4 bands</span>
                          </div>
                          <Progress value={27} className="h-2" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4">Most Visited Venues</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>The Fillmore</span>
                            <span className="text-sm">8 visits</span>
                          </div>
                          <Progress value={80} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Great American Music Hall</span>
                            <span className="text-sm">6 visits</span>
                          </div>
                          <Progress value={60} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>The Warfield</span>
                            <span className="text-sm">4 visits</span>
                          </div>
                          <Progress value={40} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Bottom of the Hill</span>
                            <span className="text-sm">3 visits</span>
                          </div>
                          <Progress value={30} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-4">Check-in History</h3>
                    <div className="border rounded-lg p-4 h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">Check-in calendar visualization would go here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Profile Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    <span>Level 12</span>
                  </div>
                  <span className="text-sm text-muted-foreground">2,340 XP to Level 13</span>
                </div>
                <Progress value={65} className="h-2" />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">47</div>
                    <div className="text-xs text-muted-foreground">Check-ins</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">29</div>
                    <div className="text-xs text-muted-foreground">Band Reviews</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">18</div>
                    <div className="text-xs text-muted-foreground">Venue Reviews</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Recent Badges</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🦉</div>
                  <div>
                    <p className="font-medium">Night Owl</p>
                    <p className="text-xs text-muted-foreground">Earned 3 days ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">🎭</div>
                  <div>
                    <p className="font-medium">Venue Veteran</p>
                    <p className="text-xs text-muted-foreground">Earned 2 weeks ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-800 w-10 h-10 rounded-full flex items-center justify-center text-xl">📸</div>
                  <div>
                    <p className="font-medium">Photographer</p>
                    <p className="text-xs text-muted-foreground">Earned 1 month ago</p>
                  </div>
                </div>
              </div>
              <Button variant="link" className="w-full mt-2">
                View All Badges
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Upcoming Shows</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-10 text-center">
                    <div className="text-xs text-muted-foreground">JUN</div>
                    <div className="text-lg font-bold">12</div>
                  </div>
                  <div>
                    <p className="font-medium">Tame Impala</p>
                    <p className="text-xs text-muted-foreground">Great American Music Hall</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-10 text-center">
                    <div className="text-xs text-muted-foreground">JUN</div>
                    <div className="text-lg font-bold">18</div>
                  </div>
                  <div>
                    <p className="font-medium">The Strokes</p>
                    <p className="text-xs text-muted-foreground">The Fillmore</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-10 text-center">
                    <div className="text-xs text-muted-foreground">JUL</div>
                    <div className="text-lg font-bold">02</div>
                  </div>
                  <div>
                    <p className="font-medium">Vampire Weekend</p>
                    <p className="text-xs text-muted-foreground">The Warfield</p>
                  </div>
                </div>
              </div>
              <Button variant="link" className="w-full mt-2">
                View Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
