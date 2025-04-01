import { motion, AnimatePresence } from "framer-motion"

interface CardSelectorProps {
    cardValues: string[]
    selectedCard: string | null
    onVote: (value: string) => void
}

export function CardSelector({ cardValues, selectedCard, onVote }: CardSelectorProps) {
    return (
        <motion.div
            className="mt-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
        >
            <h2 className="text-lg font-medium mb-4 text-center">Your Vote</h2>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
                <AnimatePresence>
                    {cardValues.map((value) => (
                        <motion.div
                            key={value}
                            onClick={() => onVote(value)}
                            className={`aspect-[2/3] cursor-pointer rounded-lg border-2 flex items-center justify-center text-xl font-bold ${selectedCard === value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                                }`}
                            whileHover={{ y: -10 }}
                            whileTap={{ scale: 0.95 }}
                            layout
                        >
                            {value}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    )
} 