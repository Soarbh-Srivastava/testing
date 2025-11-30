import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import PublicBlog from "./pages/PublicBlog";
import NotFound from "./pages/NotFound";
import BackgroundRemover from "./pages/BackgroundRemover";
import PngToJpeg from "./pages/PngToJpeg";
import JpegToPng from "./pages/JpegToPng";
import ImageCompressor from "./pages/ImageCompressor";
import ImageCropper from "./pages/ImageCropper";
import ImageResizer from "./pages/ImageResizer";
import ImageToWebp from "./pages/ImageToWebp";
import ImageToBmp from "./pages/ImageToBmp";
import MergePdfs from "./pages/MergePdfs";
import SplitPdf from "./pages/SplitPdf";
import CompressPdf from "./pages/CompressPdf";
import HtmlToPdf from "./pages/HtmlToPdf";
import ImageToPdf from "./pages/ImageToPdf";
import PdfToImage from "./pages/PdfToImage";
import PdfEditor from "./pages/PdfEditor";
import Clipboard from "./pages/Clipboard";

const queryClient = new QueryClient();

const AppContent = () => {
  useGoogleAnalytics();
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/clipboard" element={<Clipboard />} />
      <Route path="/clipboard/:code" element={<Clipboard />} />
      <Route path="/background-remover" element={<BackgroundRemover />} />
      <Route path="/png-to-jpeg" element={<PngToJpeg />} />
      <Route path="/jpeg-to-png" element={<JpegToPng />} />
      <Route path="/image-compressor" element={<ImageCompressor />} />
      <Route path="/image-cropper" element={<ImageCropper />} />
      <Route path="/image-resizer" element={<ImageResizer />} />
      <Route path="/image-to-webp" element={<ImageToWebp />} />
      <Route path="/image-to-bmp" element={<ImageToBmp />} />
      <Route path="/merge-pdfs" element={<MergePdfs />} />
      <Route path="/split-pdf" element={<SplitPdf />} />
      <Route path="/compress-pdf" element={<CompressPdf />} />
      <Route path="/html-to-pdf" element={<HtmlToPdf />} />
      <Route path="/image-to-pdf" element={<ImageToPdf />} />
      <Route path="/pdf-to-image" element={<PdfToImage />} />
      <Route path="/pdf-editor" element={<PdfEditor />} />
      
      {/* Blog routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/blog" element={<PublicBlog />} />
      
      {/* Tool-specific blog routes */}
      <Route path="/clipboard/blog" element={<BlogList />} />
      <Route path="/clipboard/blog/:slug" element={<BlogPost />} />
      <Route path="/png-to-jpeg/blog" element={<BlogList />} />
      <Route path="/png-to-jpeg/blog/:slug" element={<BlogPost />} />
      <Route path="/jpeg-to-png/blog" element={<BlogList />} />
      <Route path="/jpeg-to-png/blog/:slug" element={<BlogPost />} />
      <Route path="/image-compressor/blog" element={<BlogList />} />
      <Route path="/image-compressor/blog/:slug" element={<BlogPost />} />
      <Route path="/image-cropper/blog" element={<BlogList />} />
      <Route path="/image-cropper/blog/:slug" element={<BlogPost />} />
      <Route path="/background-remover/blog" element={<BlogList />} />
      <Route path="/background-remover/blog/:slug" element={<BlogPost />} />
      <Route path="/image-resizer/blog" element={<BlogList />} />
      <Route path="/image-resizer/blog/:slug" element={<BlogPost />} />
      <Route path="/image-to-webp/blog" element={<BlogList />} />
      <Route path="/image-to-webp/blog/:slug" element={<BlogPost />} />
      <Route path="/image-to-bmp/blog" element={<BlogList />} />
      <Route path="/image-to-bmp/blog/:slug" element={<BlogPost />} />
      <Route path="/merge-pdfs/blog" element={<BlogList />} />
      <Route path="/merge-pdfs/blog/:slug" element={<BlogPost />} />
      <Route path="/split-pdf/blog" element={<BlogList />} />
      <Route path="/split-pdf/blog/:slug" element={<BlogPost />} />
      <Route path="/compress-pdf/blog" element={<BlogList />} />
      <Route path="/compress-pdf/blog/:slug" element={<BlogPost />} />
      <Route path="/html-to-pdf/blog" element={<BlogList />} />
      <Route path="/html-to-pdf/blog/:slug" element={<BlogPost />} />
      <Route path="/image-to-pdf/blog" element={<BlogList />} />
      <Route path="/image-to-pdf/blog/:slug" element={<BlogPost />} />
      <Route path="/pdf-to-image/blog" element={<BlogList />} />
      <Route path="/pdf-to-image/blog/:slug" element={<BlogPost />} />
      <Route path="/pdf-editor/blog" element={<BlogList />} />
      <Route path="/pdf-editor/blog/:slug" element={<BlogPost />} />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
