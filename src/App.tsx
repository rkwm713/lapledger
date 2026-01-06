import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Search from "./pages/Search";
import RaceDetail from "./pages/RaceDetail";
import Auth from "./pages/Auth";
import Leagues from "./pages/Leagues";
import LeagueDetail from "./pages/LeagueDetail";
import LeagueSettings from "./pages/LeagueSettings";
import DriverPicks from "./pages/DriverPicks";
import ChaseStandings from "./pages/ChaseStandings";
import ScoringHistory from "./pages/ScoringHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            <Route path="/race/:raceId" element={<RaceDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/:leagueId" element={<LeagueDetail />} />
            <Route path="/leagues/:leagueId/settings" element={<LeagueSettings />} />
            <Route path="/leagues/:leagueId/picks" element={<DriverPicks />} />
            <Route path="/leagues/:leagueId/chase" element={<ChaseStandings />} />
            <Route path="/leagues/:leagueId/history" element={<ScoringHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
