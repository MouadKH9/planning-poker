/// <reference types="vite/client" />

interface ImportMeta {
    readonly env: {
        readonly VITE_API_URL: string
        // Add other environment variables here as needed
        [key: string]: string | undefined
    }
} 