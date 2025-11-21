import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Profil from "./pages/Profil";
import CV from "./pages/CV";
import Offres from "./pages/Offres";
import OffreDetail from "./pages/OffreDetail";
import OffreFiche from "./pages/OffreFiche";
import OffreScore from "./pages/OffreScore";
import Dashboard from "./pages/Dashboard";
import Calendrier from "./pages/Calendrier";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/cv" element={<CV />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/offres/:id" element={<OffreDetail />} />
          <Route path="/offres/:id/fiche" element={<OffreFiche />} />
          <Route path="/offres/:id/score" element={<OffreScore />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendrier" element={<Calendrier />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
