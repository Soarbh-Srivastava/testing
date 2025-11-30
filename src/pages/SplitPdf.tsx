import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Download, X, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SplitPdf = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generateThumbnails = async (pdfFile: File) => {
    const fileURL = URL.createObjectURL(pdfFile);
    const pdf = await pdfjsLib.getDocument(fileURL).promise;
    const thumbnails: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ 
        canvasContext: context,
        canvas: canvas,
        viewport: viewport
      }).promise;
      thumbnails.push(canvas.toDataURL());
    }

    setPageThumbnails(thumbnails);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0];
    if (pdfFile && pdfFile.type === 'application/pdf') {
      setFile(pdfFile);
      setSplitPdfUrl(null);
      setPageThumbnails([]);
      setSelectedPages(new Set());
      
      // Get page count
      const fileBytes = await pdfFile.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const count = pdf.getPageCount();
      setPageCount(count);
      
      // Generate thumbnails
      await generateThumbnails(pdfFile);
      
      toast({
        title: "PDF loaded",
        description: `${count} pages detected`,
      });
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const removeFile = () => {
    setFile(null);
    setSplitPdfUrl(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setPageThumbnails([]);
  };

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageNum)) {
        newSet.delete(pageNum);
      } else {
        newSet.add(pageNum);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const splitPdf = async () => {
    if (!file || selectedPages.size === 0) {
      toast({
        title: "No pages selected",
        description: "Please select at least one page",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const newPdf = await PDFDocument.create();

      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const totalPages = sortedPages.length;
      
      for (let i = 0; i < sortedPages.length; i++) {
        const pageIndex = sortedPages[i] - 1;
        const [page] = await newPdf.copyPages(pdf, [pageIndex]);
        newPdf.addPage(page);
        setProgress(((i + 1) / totalPages) * 100);
      }

      const splitPdfBytes = await newPdf.save();
      const blob = new Blob([new Uint8Array(splitPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSplitPdfUrl(url);

      toast({
        title: "Success!",
        description: `PDF created with ${selectedPages.size} selected pages`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to split PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadSplitPdf = () => {
    if (splitPdfUrl) {
      const a = document.createElement('a');
      a.href = splitPdfUrl;
      a.download = `selected-pages.pdf`;
      a.click();
    }
  };

  const uploadNew = () => {
    removeFile();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Split PDF Online</h1>
            <p className="text-muted-foreground text-lg">
              Extract specific pages from your PDF document for free
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {!splitPdfUrl ? (
                <>
                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg mb-2">
                        {isDragActive ? "Drop PDF here" : "Drag & drop a PDF file here"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">or click to select a file</p>
                      <Button variant="secondary">Select PDF</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {pageCount} pages • {selectedPages.size} selected
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={removeFile}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={selectAll} variant="outline" size="sm">
                          Select All
                        </Button>
                        <Button onClick={deselectAll} variant="outline" size="sm">
                          Deselect All
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
                        {pageThumbnails.map((thumbnail, index) => {
                          const pageNum = index + 1;
                          const isSelected = selectedPages.has(pageNum);
                          return (
                            <div
                              key={index}
                              onClick={() => togglePageSelection(pageNum)}
                              className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="absolute top-1 left-1 z-10">
                                <Checkbox checked={isSelected} />
                              </div>
                              <img
                                src={thumbnail}
                                alt={`Page ${pageNum}`}
                                className="w-full rounded"
                              />
                              <p className="text-xs text-center mt-2 font-medium">
                                Page {pageNum}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {processing && (
                        <div>
                          <Progress value={progress} className="mb-2" />
                          <p className="text-sm text-center text-muted-foreground">
                            Creating PDF... {Math.round(progress)}%
                          </p>
                        </div>
                      )}

                      {!processing && (
                        <div className="text-center">
                          <Button onClick={splitPdf} size="lg" disabled={selectedPages.size === 0}>
                            Create PDF ({selectedPages.size} pages)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">PDF Created Successfully!</h3>
                    <p className="text-muted-foreground">
                      {selectedPages.size} pages extracted and ready to download
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={downloadSplitPdf} size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download Split PDF
                    </Button>
                    <Button onClick={uploadNew} variant="outline" size="lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Split Another PDF
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">How to Use</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step 1: Upload PDF</AccordionTrigger>
                  <AccordionContent>
                    Click the upload area or drag and drop the PDF file you want to split.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Select Page Range</AccordionTrigger>
                  <AccordionContent>
                    Enter the start and end page numbers you want to extract from your PDF. For example, to extract pages 5-10, enter 5 as start page and 10 as end page.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Split & Download</AccordionTrigger>
                  <AccordionContent>
                    Click "Split PDF" to extract the selected pages. Once complete, download your new PDF containing only the pages you selected.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1">
                  <AccordionTrigger>Is it free to split PDFs?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Our PDF splitter is completely free with no limitations on file size or number of pages.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Are my files secure?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! All PDF splitting happens locally in your browser. Your files are never uploaded to any server, ensuring complete privacy and security.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Can I extract multiple page ranges?</AccordionTrigger>
                  <AccordionContent>
                    Currently, you can extract one continuous page range at a time. To extract multiple separate ranges, split them one at a time.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Does it work on mobile?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Our tool is fully responsive and works on all devices including smartphones and tablets.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SplitPdf;
