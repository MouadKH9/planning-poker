import { Button } from "@/components/ui/button";
import { ChevronLeft, Copy, Users } from "lucide-react";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Participant } from "@/types/index";

interface RoomHeaderProps {
  roomId: string;
  participants: Participant[];
  isHost?: boolean;
  onSkipParticipant?: (participantId: number) => void; // Fixed: Added parameter
}

export function RoomHeader({
  roomId,
  participants,
  isHost,
  onSkipParticipant, // Renamed for clarity
}: RoomHeaderProps) {
  const navigate = useNavigate();

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    toast.success("Room link copied!", {
      description: "Share this link with your team members",
    });
  };

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="font-bold text-xl">PlanningPoker</div>
      </div>

      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={copyRoomLink}
              >
                <span className="font-mono">{roomId}</span>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy room link</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Remove the skip button from header since it should be per participant */}
        {/* Temporarily disable settings until route is properly implemented */}
        {/* {isHost && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/room/${roomId}/settings`)}
          >
            Settings
          </Button>
        )} */}

        <div className="flex -space-x-2">
          {participants.map((participant) => (
            <TooltipProvider key={participant.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer">
                    <ParticipantAvatar
                      name={participant.username}
                      className="border-2 border-white h-8 w-8"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-center gap-1">
                    <p>{participant.username}</p>
                    {participant.has_voted ? (
                      <span className="text-green-600 text-xs">✓ Voted</span>
                    ) : (
                      <span className="text-orange-600 text-xs">
                        ⏳ Waiting
                      </span>
                    )}
                    {isHost && onSkipParticipant && !participant.has_voted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSkipParticipant(participant.id)}
                        className="text-xs h-6"
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-100 border-2 border-white">
            <Users className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
