export function BadgeGrid() {
  const badges = [
    { name: "Night Owl", description: "Attended 5 shows that started after 10pm", icon: "🦉" },
    { name: "Venue Veteran", description: "Visited 10 different venues", icon: "🎭" },
    { name: "Photographer", description: "Uploaded 20 concert photos", icon: "📸" },
    { name: "Superfan", description: "Saw the same band 3 times", icon: "🎵" },
    { name: "Critic", description: "Wrote 25 detailed reviews", icon: "✍️" },
    { name: "Social Butterfly", description: "Connected with 10 other users", icon: "🦋" },
    { name: "Early Bird", description: "Attended 5 shows that started before 7pm", icon: "🐦" },
    { name: "Roadie", description: "Attended concerts in 3 different cities", icon: "🚐" },
    { name: "Headbanger", description: "Reviewed 5 metal bands", icon: "🤘" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {badges.map((badge, index) => (
        <div key={index} className="border rounded-lg p-4 flex flex-col items-center text-center gap-2">
          <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2">
            {badge.icon}
          </div>
          <h4 className="font-bold">{badge.name}</h4>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
        </div>
      ))}
    </div>
  )
}
