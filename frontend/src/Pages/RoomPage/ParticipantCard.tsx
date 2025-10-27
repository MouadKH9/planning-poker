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
  const renderUsername = () => {
    if (participant.is_anonymous) {
      return `🎭 ${participant.username}`;
    }
    return participant.username;
  };

  const renderHostAction = () => {
    if (!isHost) return null;
    if (!participant.has_voted) {
      return (
        <span className="text-destructive dark:text-red-400 text-sm">
          Waiting for vote...
        </span>
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        className="text-blue-600 dark:text-blue-400 text-sm hover:underline border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
        onClick={onSkip}
      >
        Skip
      </Button>
    );
  };

  const renderVote = () => {
    if (!isRevealed)
      return <motion.div
        className="h-10 bg-white dark:bg-black px-6 py-6 w-8 rounded flex items-center justify-center font-bold text-foreground border border-border shadow-sm text-2xl"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {"?"}
      </motion.div>;

    return (
      <motion.div
        className="h-10 bg-white dark:bg-black px-6 py-6 w-8 rounded flex items-center justify-center font-bold text-foreground border border-border shadow-sm text-2xl"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {participant.card_selection || "?"}
      </motion.div>
    );
  };

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
      <div className="flex items-center flex-col justify-between mb-2 gap-4">
        <span
          className={cn(
            "text-sm font-medium text-foreground",
            participant.is_anonymous &&
            "text-purple-600 dark:text-purple-400 font-bold"
          )}
        >
          {renderUsername()}
          {/* {renderHostAction()} */}
        </span>
        <div className="flex items-center justify-center flex-col">
          {renderVote()}
        </div>
      </div>
    </motion.div>
  );
}
