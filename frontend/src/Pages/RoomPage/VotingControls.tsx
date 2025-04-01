import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface VotingControlsProps {
    isRevealed: boolean
    selectedCard: string | null
    onReveal: () => void
    onReset: () => void
}

export function VotingControls({ isRevealed, selectedCard, onReveal, onReset }: VotingControlsProps) {
    return (
        <motion.div
            className="flex justify-center mb-8 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
        >
            {isRevealed ? (
                <Button onClick={onReset} variant="outline" className="px-8">
                    Reset Votes
                </Button>
            ) : (
                <Button
                    onClick={onReveal}
                    className="bg-zinc-900 hover:bg-zinc-800 px-8"
                    disabled={!selectedCard}
                >
                    Reveal Cards
                </Button>
            )}
        </motion.div>
    )
} 