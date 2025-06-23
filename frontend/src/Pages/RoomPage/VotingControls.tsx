import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface VotingControlsProps {
  isRevealed: boolean;
  selectedCard: string | null;
  isHost: boolean;
  isAdmin?: boolean;
  canControl?: boolean;
  onReveal: () => void;
  onReset: () => void;
  onStartRound: () => void;
}

export function VotingControls({
  isRevealed,
  selectedCard,
  isHost,
  isAdmin = false,
  canControl = false,
  onReveal,
  onReset,
  onStartRound,
}: VotingControlsProps) {
  // Only show controls if user can control the game
  if (!canControl && !isHost && !isAdmin) {
    return null;
  }

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-4 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      {/* Admin badge */}
      {isAdmin && (
        <div className="w-full text-center mb-2">
          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
            🛡️ Admin Controls
          </span>
        </div>
      )}

      {!isRevealed ? (
        <Button
          onClick={onReveal}
          className="bg-zinc-900 hover:bg-zinc-800 px-8"
          disabled={!selectedCard}
        >
          Reveal Cards
        </Button>
      ) : (
        <div className="flex gap-4">
          <Button onClick={onReset} variant="outline" className="px-8">
            Reset Votes
          </Button>
          <Button
            onClick={onStartRound}
            className="bg-green-600 hover:bg-green-500 px-8"
          >
            Start New Round
          </Button>
        </div>
      )}
    </motion.div>
  );
}
