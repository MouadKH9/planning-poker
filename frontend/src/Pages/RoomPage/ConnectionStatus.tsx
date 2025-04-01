import { motion } from "framer-motion"

interface ConnectionStatusProps {
    isConnected: boolean
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
    if (isConnected) return null

    return (
        <motion.div
            className="bg-yellow-50 text-yellow-800 p-2 rounded-md mb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            Connecting to room...
        </motion.div>
    )
} 