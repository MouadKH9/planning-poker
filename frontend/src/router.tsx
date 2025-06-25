import { createBrowserRouter } from "react-router-dom";
import WelcomePage from "./Pages/WelcomePage/WelcomePage";
import RoomPage from "./Pages/RoomPage/RoomPage";
import SignupPage from "./Pages/Auth/SignupPage/SignupPage";
import LoginPage from "./Pages/Auth/LoginPage/LoginPage";
import PageNotFound from "./Pages/PageNotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <WelcomePage />,
    errorElement: <PageNotFound />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <PageNotFound />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
    errorElement: <PageNotFound />,
  },
  {
    path: "/room/:roomId",
    element: <RoomPage />,
    errorElement: <PageNotFound />,
  },
  {
    path: "/room/:roomId/settings",
    element: <RoomPage />, // For now, redirect to room page
    errorElement: <PageNotFound />,
  },
]);
