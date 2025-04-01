import { Navigate } from 'react-router-dom'

function App() {
  // This file is no longer used directly, as routes are configured in router.tsx
  // Redirecting to home page in case this component is still called directly
  return <Navigate to="/" replace />
}

export default App

