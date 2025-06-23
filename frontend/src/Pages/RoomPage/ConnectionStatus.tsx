import { motion } from "framer-motion";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <motion.div
      className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
        isConnected
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span
        className={`text-sm font-medium ${
          isConnected ? "text-green-800" : "text-red-800"
        }`}
      >
        {isConnected ? "Connected" : "Disconnected"}
      </span>
      {!isConnected && (
        <span className="text-xs text-red-600">
          - Check if backend server is running
        </span>
      )}
    </motion.div>
  );
}
