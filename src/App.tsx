import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getPreviewRouterBasename } from "@/lib/previewBase";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import BusinessConsultancy from "./pages/BusinessConsultancy";
import Bookkeeping from "./pages/Bookkeeping";
import Clothing from "./pages/Clothing";
import Beauty from "./pages/Beauty";
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
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/business-consultancy" element={<BusinessConsultancy />} />
        <Route path="/bookkeeping" element={<Bookkeeping />} />
        <Route path="/clothing" element={<Clothing />} />
        <Route path="/beauty" element={<Beauty />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
