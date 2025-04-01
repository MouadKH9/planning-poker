import { Button } from "@/components/ui/button"
import { ChevronLeft, Copy, Users } from "lucide-react"
import { ParticipantAvatar } from "@/components/ParticipantAvatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface Participant {
    id: number
    name: string
    avatar: string
    vote: number | null
}

interface RoomHeaderProps {
    roomId: string
    participants: Participant[]
}

export function RoomHeader({ roomId, participants }: RoomHeaderProps) {
    const navigate = useNavigate()

    const copyRoomLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
        toast.success("Room link copied!", {
            description: "Share this link with your team members"
        })
    }

    return (
        <header className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="font-bold text-xl">PlanningPoker</div>
            </div>
            <div className="flex items-center gap-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={copyRoomLink}>
                                <span className="font-mono">{roomId}</span>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Copy room link</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex -space-x-2">
                    {participants.map((participant) => (
                        <ParticipantAvatar
                            key={participant.id}
                            name={participant.name}
                            className="border-2 border-white h-8 w-8"
                        />
                    ))}
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-100 border-2 border-white">
                        <Users className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </header>
    )
} 