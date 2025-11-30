import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb } from "pdf-lib";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit3,
  Save,
  MousePointer2,
  Highlighter,
  Square,
  Circle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Configure PDF.js worker - use protocol-relative URL for better compatibility
// PDF.js 5.4.394 worker location
if (typeof window !== "undefined") {
  // Use unpkg.com which is more reliable than cdnjs for this version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  color: { r: number; g: number; b: number };
  rotation: number;
  pageIndex: number;
  pageWidth: number; // Original page width in points
  pageHeight: number; // Original page height in points
}

interface Annotation {
  id: string;
  type: "draw" | "highlight" | "rectangle" | "circle";
  path: Array<{ x: number; y: number }>;
  color: string;
  pageIndex: number;
}

const PdfEditor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingMode, setEditingMode] = useState<"view" | "edit" | "annotate">(
    "view"
  );
  const [selectedTool, setSelectedTool] = useState<
    "pointer" | "text" | "highlight" | "rectangle" | "circle"
  >("pointer");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentViewport, setCurrentViewport] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentAnnotationRef = useRef<Annotation | null>(null);

  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const pdfFile = acceptedFiles[0];
        if (pdfFile.type !== "application/pdf") {
          toast({
            title: "Invalid file",
            description: "Please upload a PDF file",
            variant: "destructive",
          });
          return;
        }
        if (pdfFile.size > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please upload a PDF smaller than 50MB",
            variant: "destructive",
          });
          return;
        }
        setFile(pdfFile);
        loadPdf(pdfFile);
      }
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const loadPdf = async (pdfFile: File) => {
    try {
      setIsProcessing(true);
      setProgress(10);

      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setTextItems([]);
      setAnnotations([]);
      setScale(1.5);

      setProgress(50);

      // Extract text from all pages
      await extractTextFromPdf(pdf);

      setProgress(100);
      setIsProcessing(false);

      toast({
        title: "PDF loaded",
        description: `Successfully loaded ${pdf.numPages} page(s)`,
      });
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const extractTextFromPdf = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const extractedItems: TextItem[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      textContent.items.forEach((item: any, index: number) => {
        if (item.str && item.transform) {
          const transform = item.transform;
          // Transform matrix: [a, b, c, d, e, f]
          // a, d = scale, e, f = translation
          const fontSize =
            Math.abs(transform[0]) ||
            Math.abs(transform[3]) ||
            item.height ||
            12;
          const x = transform[4] || 0;
          const y = transform[5] || 0;

          // Get text width and height from transform or item
          const width = item.width || item.str.length * fontSize * 0.6;
          const height = item.height || fontSize;

          // Get color from item (normalize to 0-255 range)
          let color = { r: 0, g: 0, b: 0 };
          if (item.color) {
            if (Array.isArray(item.color)) {
              // PDF.js color is 0-1 range
              color = {
                r: Math.round(item.color[0] * 255),
                g: item.color.length > 1 ? Math.round(item.color[1] * 255) : 0,
                b: item.color.length > 2 ? Math.round(item.color[2] * 255) : 0,
              };
            } else if (typeof item.color === "object") {
              color = item.color;
            }
          }

          // PDF.js uses bottom-left origin, convert to top-left
          // viewport.height is the page height in points
          const pdfY = viewport.height - y;

          extractedItems.push({
            id: `text-${pageNum}-${index}`,
            text: item.str,
            x: x, // X is already in PDF coordinates
            y: pdfY, // Converted to top-left origin
            width: width,
            height: height,
            fontSize: fontSize,
            fontName: item.fontName || "Helvetica",
            color: color,
            rotation: 0, // Could extract from transform if needed
            pageIndex: pageNum - 1,
            pageWidth: viewport.width,
            pageHeight: viewport.height,
          });
        }
      });
    }

    setTextItems(extractedItems);
  };

  const coverOriginalText = (pageIndex: number) => {
    if (!canvasRef.current || !currentViewport || editingMode !== "edit")
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pageTextItems = getTextItemsForPage(pageIndex);
    if (pageTextItems.length === 0) return;

    // Draw white rectangles to cover original text
    pageTextItems.forEach((textItem) => {
      const screenCoords = convertPdfToScreenCoords(textItem);
      if (!screenCoords) return;

      // Draw white rectangle to cover the original text
      // Use a slightly larger area to ensure complete coverage
      const padding = 3;
      ctx.fillStyle = "#ffffff"; // White
      ctx.fillRect(
        screenCoords.x - padding,
        screenCoords.y - padding,
        screenCoords.width + padding * 2,
        screenCoords.height + padding * 2
      );
    });
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Store viewport for coordinate conversion
      if (pageNum === currentPage) {
        setCurrentViewport(viewport);
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // If in edit mode, cover original text with white rectangles
      if (pageNum === currentPage && editingMode === "edit") {
        coverOriginalText(pageNum - 1);
      }

      // Render annotations for this page
      if (pageNum === currentPage) {
        renderAnnotations(pageNum - 1);
      }
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const renderAnnotations = (pageIndex: number) => {
    if (!annotationCanvasRef.current || !canvasRef.current) return;

    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to PDF canvas
    canvas.width = canvasRef.current.width;
    canvas.height = canvasRef.current.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations.filter(
      (a) => a.pageIndex === pageIndex
    );
    if (pageAnnotations.length === 0) return;

    pageAnnotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.type === "highlight" ? 15 : 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (annotation.type === "draw" || annotation.type === "highlight") {
        if (annotation.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(annotation.path[0].x, annotation.path[0].y);
          for (let i = 1; i < annotation.path.length; i++) {
            ctx.lineTo(annotation.path[i].x, annotation.path[i].y);
          }
          if (annotation.type === "highlight") {
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          } else {
            ctx.stroke();
          }
        }
      } else if (annotation.type === "rectangle") {
        if (annotation.path.length >= 2) {
          const start = annotation.path[0];
          const end = annotation.path[annotation.path.length - 1];
          const width = end.x - start.x;
          const height = end.y - start.y;
          ctx.strokeRect(start.x, start.y, width, height);
        }
      } else if (annotation.type === "circle") {
        if (annotation.path.length >= 2) {
          const start = annotation.path[0];
          const end = annotation.path[annotation.path.length - 1];
          const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    });

    // Draw current annotation if drawing
    if (isDrawingRef.current && currentAnnotationRef.current) {
      ctx.strokeStyle = currentAnnotationRef.current.color;
      ctx.lineWidth =
        currentAnnotationRef.current.type === "highlight" ? 15 : 2;

      if (currentAnnotationRef.current.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(
          currentAnnotationRef.current.path[0].x,
          currentAnnotationRef.current.path[0].y
        );
        for (let i = 1; i < currentAnnotationRef.current.path.length; i++) {
          ctx.lineTo(
            currentAnnotationRef.current.path[i].x,
            currentAnnotationRef.current.path[i].y
          );
        }
        if (currentAnnotationRef.current.type === "highlight") {
          ctx.globalAlpha = 0.3;
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }
  };

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, editingMode, textItems]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderAnnotations(currentPage - 1);
    }
  }, [annotations, currentPage, scale]);

  const updateTextItem = (id: string, newText: string) => {
    setTextItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const getTextItemsForPage = (pageIndex: number) => {
    return textItems.filter((item) => item && item.pageIndex === pageIndex);
  };

  const convertPdfToScreenCoords = (textItem: TextItem) => {
    if (!canvasRef.current || !currentViewport) return null;

    const canvas = canvasRef.current;

    // textItem has the original page dimensions stored
    // currentViewport has the scaled dimensions
    // Convert PDF point coordinates to screen pixel coordinates
    const screenX = (textItem.x / textItem.pageWidth) * canvas.width;
    const screenY = (textItem.y / textItem.pageHeight) * canvas.height;
    const screenWidth = (textItem.width / textItem.pageWidth) * canvas.width;
    const screenHeight =
      (textItem.height / textItem.pageHeight) * canvas.height;

    return {
      x: screenX,
      y: screenY,
      width: Math.max(screenWidth, 30),
      height: Math.max(screenHeight, 15),
    };
  };

  const handleAnnotationStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === "pointer" || !annotationCanvasRef.current) return;

    isDrawingRef.current = true;
    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const annotation: Annotation = {
      id: `annotation-${Date.now()}`,
      type: selectedTool === "text" ? "draw" : (selectedTool as any),
      path: [{ x, y }],
      color: selectedTool === "highlight" ? "#ffff00" : "#ff0000",
      pageIndex: currentPage - 1,
    };

    currentAnnotationRef.current = annotation;
  };

  const handleAnnotationMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      !isDrawingRef.current ||
      !annotationCanvasRef.current ||
      !currentAnnotationRef.current
    )
      return;

    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentAnnotationRef.current.path.push({ x, y });
    renderAnnotations(currentPage - 1);
  };

  const handleAnnotationEnd = () => {
    if (isDrawingRef.current && currentAnnotationRef.current) {
      setAnnotations((prev) => [...prev, currentAnnotationRef.current!]);
      currentAnnotationRef.current = null;
    }
    isDrawingRef.current = false;
  };

  const exportPdf = async () => {
    if (!file || !pdfDoc) {
      toast({
        title: "No PDF loaded",
        description: "Please upload a PDF first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      const arrayBuffer = await file.arrayBuffer();
      const pdfDocLib = await PDFDocument.load(arrayBuffer);

      setProgress(20);

      // Process each page
      for (
        let pageIndex = 0;
        pageIndex < pdfDocLib.getPageCount();
        pageIndex++
      ) {
        const page = pdfDocLib.getPage(pageIndex);
        const pageTextItems = textItems.filter(
          (item) => item.pageIndex === pageIndex
        );

        // Get original page dimensions
        const { width, height } = page.getSize();

        // First, cover original text with white rectangles to "erase" them
        // Then draw the edited text on top
        for (const textItem of pageTextItems) {
          // Calculate position in bottom-left coordinate system (pdf-lib uses this)
          // textItem.y is top of text in top-left coordinates
          // In bottom-left: bottom of text = height - textItem.y - textItem.height
          const textBottom = height - textItem.y - textItem.height;

          // Draw white rectangle to cover the original text
          // Add small padding to ensure complete coverage
          const padding = 2;
          page.drawRectangle({
            x: textItem.x - padding,
            y: textBottom - padding,
            width: textItem.width + padding * 2,
            height: textItem.height + padding * 2,
            color: rgb(1, 1, 1), // White
            borderColor: rgb(1, 1, 1),
            borderWidth: 0,
          });
        }

        // Now draw the edited text on top of the white rectangles
        for (const textItem of pageTextItems) {
          if (textItem.text.trim()) {
            try {
              // Convert color (ensure values are in 0-1 range)
              const color = rgb(
                Math.min(1, Math.max(0, textItem.color.r / 255)),
                Math.min(1, Math.max(0, textItem.color.g / 255)),
                Math.min(1, Math.max(0, textItem.color.b / 255))
              );

              // Draw text at original position
              // Note: pdf-lib uses bottom-left origin for text baseline
              // textItem.y is top of text in top-left coordinates
              // For text drawing, we need the baseline: height - textItem.y
              const yPos = height - textItem.y;

              // Use Helvetica as default font (pdf-lib built-in)
              // For custom fonts, you'd need to embed them
              page.drawText(textItem.text, {
                x: textItem.x,
                y: yPos,
                size: textItem.fontSize,
                color: color,
                font: await pdfDocLib.embedFont("Helvetica"), // Use standard font
              });
            } catch (error) {
              console.warn("Error drawing text:", error);
              // Fallback: try without font specification
              try {
                const color = rgb(
                  Math.min(1, Math.max(0, textItem.color.r / 255)),
                  Math.min(1, Math.max(0, textItem.color.g / 255)),
                  Math.min(1, Math.max(0, textItem.color.b / 255))
                );
                const yPos = height - textItem.y;
                page.drawText(textItem.text, {
                  x: textItem.x,
                  y: yPos,
                  size: textItem.fontSize,
                  color: color,
                });
              } catch (fallbackError) {
                console.warn(
                  "Fallback text drawing also failed:",
                  fallbackError
                );
              }
            }
          }
        }

        setProgress(20 + ((pageIndex + 1) / pdfDocLib.getPageCount()) * 60);
      }

      setProgress(80);

      // Add annotations as drawings (simplified - would need more complex implementation for full annotation support)

      const pdfBytes = await pdfDocLib.save();
      setProgress(100);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", "_edited.pdf");
      a.click();

      URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: "PDF exported successfully",
      });

      setIsProcessing(false);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleFitToWidth = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 100;
    const canvasWidth = canvasRef.current.width / scale;
    setScale(containerWidth / canvasWidth);
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 100;
    const containerHeight = containerRef.current.clientHeight - 100;
    const canvasWidth = canvasRef.current.width / scale;
    const canvasHeight = canvasRef.current.height / scale;
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    setScale(Math.min(scaleX, scaleY));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">PDF Editor</h1>
            <p className="text-muted-foreground text-lg">
              Upload, view, edit text, annotate, and download PDFs
            </p>
          </div>

          {!file ? (
            <Card>
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg mb-2">
                    {isDragActive
                      ? "Drop PDF here"
                      : "Drag & drop a PDF file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to select a file
                  </p>
                  <Button variant="secondary">Select PDF</Button>
                </div>

                {isProcessing && (
                  <div className="mt-6">
                    <Progress value={progress} className="mb-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Loading PDF... {Math.round(progress)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Toolbar */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={editingMode === "view" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditingMode("view")}
                      >
                        <MousePointer2 className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant={editingMode === "edit" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setEditingMode("edit");
                          setSelectedTool("pointer");
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Text
                      </Button>
                      <Button
                        variant={
                          editingMode === "annotate" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setEditingMode("annotate");
                          setSelectedTool("highlight");
                        }}
                      >
                        <Highlighter className="w-4 h-4 mr-2" />
                        Annotate
                      </Button>
                    </div>

                    {editingMode === "annotate" && (
                      <div className="flex items-center gap-2 border-l pl-4">
                        <Button
                          variant={
                            selectedTool === "highlight" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedTool("highlight")}
                        >
                          <Highlighter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={
                            selectedTool === "rectangle" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedTool("rectangle")}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={
                            selectedTool === "circle" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedTool("circle")}
                        >
                          <Circle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 border-l pl-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm w-16 text-center">
                        {Math.round(scale * 100)}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFitToWidth}
                      >
                        Fit Width
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFitToScreen}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4 ml-auto">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={exportPdf}
                        disabled={isProcessing}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setPdfDoc(null);
                          setTextItems([]);
                          setAnnotations([]);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        New PDF
                      </Button>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="mt-4">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Processing... {Math.round(progress)}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Main Editor Area */}
              <div className="grid grid-cols-12 gap-4">
                {/* Sidebar - Page Navigation */}
                <div className="col-span-2">
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-4">Pages</h3>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-full p-3 text-left rounded-lg border transition-colors ${
                              currentPage === pageNum
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Page {pageNum}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* PDF Viewer */}
                <div className="col-span-10">
                  <Card>
                    <CardContent className="pt-4">
                      <div
                        ref={containerRef}
                        className="relative bg-gray-100 rounded-lg overflow-auto"
                        style={{ maxHeight: "80vh", minHeight: "600px" }}
                      >
                        <div className="relative inline-block">
                          <canvas
                            ref={canvasRef}
                            className="border border-gray-300"
                            style={{ display: "block" }}
                          />
                          {editingMode === "annotate" && (
                            <canvas
                              ref={annotationCanvasRef}
                              className="absolute top-0 left-0 cursor-crosshair"
                              style={{ zIndex: 10 }}
                              onMouseDown={handleAnnotationStart}
                              onMouseMove={handleAnnotationMove}
                              onMouseUp={handleAnnotationEnd}
                              onMouseLeave={handleAnnotationEnd}
                            />
                          )}
                          {editingMode !== "annotate" && (
                            <canvas
                              ref={annotationCanvasRef}
                              className="absolute top-0 left-0 pointer-events-none"
                              style={{ display: "block" }}
                            />
                          )}

                          {/* Text Overlay for Editing */}
                          {editingMode === "edit" &&
                            pdfDoc &&
                            currentViewport && (
                              <div
                                ref={overlayRef}
                                className="absolute top-0 left-0 pointer-events-none"
                                style={{
                                  width: canvasRef.current?.width || 0,
                                  height: canvasRef.current?.height || 0,
                                }}
                              >
                                {(() => {
                                  const pageTextItems = getTextItemsForPage(
                                    currentPage - 1
                                  );
                                  return pageTextItems.map((textItem) => {
                                    const screenCoords =
                                      convertPdfToScreenCoords(textItem);

                                    if (!screenCoords) return null;

                                    return (
                                      <div
                                        key={textItem.id}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                          updateTextItem(
                                            textItem.id,
                                            e.currentTarget.textContent || ""
                                          );
                                        }}
                                        className="absolute border border-blue-400 bg-blue-50/30 p-0.5 rounded pointer-events-auto cursor-text"
                                        style={{
                                          left: `${screenCoords.x}px`,
                                          top: `${screenCoords.y}px`,
                                          width: `${screenCoords.width}px`,
                                          minHeight: `${screenCoords.height}px`,
                                          fontSize: `${
                                            textItem.fontSize * scale * 0.75
                                          }px`,
                                          fontFamily: textItem.fontName,
                                          color: `rgb(${textItem.color.r}, ${textItem.color.g}, ${textItem.color.b})`,
                                          lineHeight: "1.2",
                                          overflow: "hidden",
                                          wordWrap: "break-word",
                                          transform: textItem.rotation
                                            ? `rotate(${textItem.rotation}deg)`
                                            : undefined,
                                        }}
                                      >
                                        {textItem.text}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PdfEditor;
