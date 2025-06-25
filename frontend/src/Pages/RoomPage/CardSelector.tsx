import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardSelectorProps {
  cardValues: string[];
  selectedCard: string | null;
  onVote: (value: string) => void;
}

export function CardSelector({
  cardValues,
  selectedCard,
  onVote,
}: CardSelectorProps) {
  return (
    <motion.div
      className="mt-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <h2 className="text-lg font-medium mb-4 text-center text-foreground">
        Your Vote
      </h2>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
        <AnimatePresence>
          {cardValues.map((value) => (
            <motion.div
              key={value}
              onClick={() => onVote(value)}
              className={cn(
                "aspect-[2/3] cursor-pointer rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors",
                selectedCard === value
                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/80"
                  : "border-border bg-card text-foreground hover:border-border/80 hover:bg-accent/50 dark:hover:border-border/60 dark:hover:bg-accent/30"
              )}
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
  );
}
