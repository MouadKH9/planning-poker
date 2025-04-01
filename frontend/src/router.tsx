import { createBrowserRouter } from 'react-router-dom'
import WelcomePage from './Pages/WelcomePage'
import PageNotFound from './Pages/PageNotFound'

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <WelcomePage />
        ),
        errorElement: <PageNotFound />,
    },
]) 