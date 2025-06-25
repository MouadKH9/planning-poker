import { motion } from "framer-motion";
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
        "border rounded-lg p-4 text-center transition-all bg-card",
        participant.has_voted
          ? "border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5"
          : "border-border bg-card",
        participant.is_anonymous &&
          "border-dashed border-purple-500/50 dark:border-purple-400/50"
      )}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium text-foreground",
            participant.is_anonymous &&
              "text-purple-600 dark:text-purple-400 font-bold"
          )}
        >
          {participant.is_anonymous
            ? `🎭 ${participant.username}`
            : participant.username}
        </span>
        <div className="mt-2 h-12 flex items-center justify-center">
          {isHost && !participant.has_voted && (
            <span className="text-destructive dark:text-red-400 text-sm">
              Waiting for vote...
            </span>
          )}
          {isHost && participant.has_voted && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
          {participant.vote !== null ? (
            isRevealed ? (
              <motion.div
                className="bg-muted dark:bg-muted h-10 w-8 rounded flex items-center justify-center font-bold text-foreground border border-border shadow-sm"
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {cardValues[participant.vote]}
              </motion.div>
            ) : (
              <motion.div
                className="bg-primary dark:bg-primary h-10 w-8 rounded shadow-sm border border-border"
                whileHover={{ scale: 1.05 }}
              />
            )
          ) : (
            <span className="text-muted-foreground text-sm">No vote</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
