import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getPreviewRouterBasename } from "@/lib/previewBase";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Sonner />
    <BrowserRouter
      basename={getPreviewRouterBasename()}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
