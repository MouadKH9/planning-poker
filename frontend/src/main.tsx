import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'
import { ThemeProvider } from './theme-provider.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="planning-poker-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
