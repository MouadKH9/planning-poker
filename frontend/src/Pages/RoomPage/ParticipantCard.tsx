import { motion } from "framer-motion";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Participant } from "@/types/index";

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
      className="bg-white rounded-lg p-4 shadow-sm border flex flex-col items-center"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <ParticipantAvatar
        name={participant.username}
        className="h-16 w-16 mb-2"
      />
      <p className="font-medium">{participant.username}</p>
      <div className="mt-2 h-12 flex items-center justify-center">
        {isHost && !participant.has_voted && (
          <span className="text-red-500 text-sm">Waiting for vote...</span>
        )}
        {isHost && participant.has_voted && (
          <button
            className="text-blue-600 text-sm hover:underline"
            onClick={onSkip}
          >
            Skip
          </button>
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
    </motion.div>
  );
}
