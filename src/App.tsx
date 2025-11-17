import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { GerenciadorProvider } from "@/contexts/GerenciadorContext";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import RegisterUser from "./pages/RegisterUser";
import Performance from "./pages/Performance";
import UploadUsers from "./pages/UploadUsers";
import UploadPerformance from "./pages/UploadPerformance";
import Trainings from "./pages/Trainings";
import CreateTraining from "./pages/CreateTraining";
import SincronizarSenhas from "./pages/SincronizarSenhas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GerenciadorProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/register" element={<RegisterUser />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/upload-users" element={<UploadUsers />} />
                <Route path="/upload-performance" element={<UploadPerformance />} />
                <Route path="/trainings" element={<Trainings />} />
                <Route path="/trainings/create" element={<CreateTraining />} />
                <Route path="/trainings/:id/edit" element={<CreateTraining />} />
                <Route path="/sincronizar-senhas" element={<SincronizarSenhas />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </GerenciadorProvider>
    </QueryClientProvider>
  );
};

export default App;
