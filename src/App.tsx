import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "@/lib/queryPersister";
import { registerOfflineMutationDefaults } from "@/lib/offlineMutations";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HydrationProvider, useHydration } from "@/contexts/HydrationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SpaRedirector from "@/components/SpaRedirector";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import Index from "./pages/Index";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Activity from "./pages/Activity";
import Account from "./pages/Account";
import AddExpense from "./pages/AddExpense";
import Auth from "./pages/Auth";
import FriendDetail from "./pages/FriendDetail";
import NotFound from "./pages/NotFound";

// Configure QueryClient with persistence-friendly settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache data for 24 hours (persisted to IndexedDB)
      gcTime: 1000 * 60 * 60 * 24,
      // Refetch on mount if data is stale
      refetchOnMount: true,
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
    },
  },
});

// Attach mutationFns for offline-capable writes so paused mutations restored
// from IndexedDB can resume and sync once the network returns
registerOfflineMutationDefaults(queryClient);

// Create IndexedDB persister for offline-first experience
const persister = createIDBPersister();

// Inner component that can access HydrationContext
function AppContent() {
  const { markHydrated } = useHydration();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        // Keep cache for 7 days
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: 'v1',
        // CRITICAL: Explicitly dehydrate successful queries to ensure data is persisted
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
          // Persist writes made offline so they survive an app restart
          shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
        },
      }}
      // Critical: Don't block rendering while restoring cache
      onSuccess={() => {
        // Mark hydration complete so offline logic can safely check cache
        markHydrated();
        // Replay writes that were queued offline, then refresh from the server
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <TooltipProvider>
        <AuthProvider>
          <CurrencyProvider>
            <Toaster />
            <Sonner position="top-center" />
            <BrowserRouter>
              <SpaRedirector />
              <DeepLinkHandler />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
                <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
                <Route path="/friend/:friendId" element={<ProtectedRoute><FriendDetail /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CurrencyProvider>
        </AuthProvider>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

const App = () => (
  <ThemeProvider>
    <HydrationProvider>
      <AppContent />
    </HydrationProvider>
  </ThemeProvider>
);

export default App;
