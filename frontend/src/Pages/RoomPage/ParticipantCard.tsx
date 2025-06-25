import { motion } from "framer-motion";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Participant } from "@/types/index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParticipantCardProps {
  participant: Participant;
  isRevealed: boolean;
  cardValues: string[];
  isHost?: boolean;
  onSkip: () => void;
}

export function ParticipantCard({
  participant,
  isRevealed,
  cardValues,
  isHost,
  onSkip,
}: ParticipantCardProps) {
  return (
    <motion.div
      className={cn(
        "border rounded-lg p-4 text-center transition-all",
        participant.has_voted
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-white",
        participant.is_anonymous && "border-dashed" // Visual indicator for anonymous users
      )}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            participant.is_anonymous && "text-purple-600 font-bold"
          )}
        >
          {participant.is_anonymous
            ? `🎭 ${participant.username}`
            : participant.username}
        </span>
        <div className="mt-2 h-12 flex items-center justify-center">
          {isHost && !participant.has_voted && (
            <span className="text-red-500 text-sm">Waiting for vote...</span>
          )}
          {isHost && participant.has_voted && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 text-sm hover:underline"
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
          {participant.vote !== null ? (
            isRevealed ? (
              <motion.div
                className="bg-zinc-100 h-10 w-8 rounded flex items-center justify-center font-bold"
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {cardValues[participant.vote]}
              </motion.div>
            ) : (
              <motion.div
                className="bg-zinc-800 h-10 w-8 rounded"
                whileHover={{ scale: 1.05 }}
              />
            )
          ) : (
            <span className="text-zinc-400 text-sm">No vote</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
