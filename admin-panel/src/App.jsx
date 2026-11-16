import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import GalleryPage from "./pages/GalleryPage";
import VideoPage from "./pages/VideoPage";
import TeamsPage from "./pages/TeamsPage";
import MasterClassesPage from "./pages/MasterClassesPage";
import ReviewsPage from "./pages/ReviewsPage";
import AboutPage from "./pages/AboutPage";
import AccessPage from "./pages/AccessPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/about" element={<AboutPage />} />
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/masterclasses" element={<MasterClassesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/access" element={<AccessPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
