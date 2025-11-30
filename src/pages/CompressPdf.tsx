import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, FileText, Download, X, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const CompressPdf = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedPdfUrl, setCompressedPdfUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0];
    if (pdfFile && pdfFile.type === 'application/pdf') {
      setFile(pdfFile);
      setOriginalSize(pdfFile.size);
      setCompressedPdfUrl(null);
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
    setCompressedPdfUrl(null);
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const compressPdf = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);

    try {
      const fileBytes = await file.arrayBuffer();
      setProgress(10);
      
      // Load PDF with pdfjs to get actual page count
      const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      setProgress(20);

      // Create new PDF document
      const newPdf = await PDFDocument.create();
      
      // Process each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduce scale for compression
        
        // Create canvas to render page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;
        
        // Convert canvas to compressed JPEG
        const imageData = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
        const imageBytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
        
        // Embed image in new PDF
        const image = await newPdf.embedJpg(imageBytes);
        const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
        
        setProgress(20 + (i / numPages) * 60);
      }
      
      setProgress(85);

      // Save the compressed PDF
      const compressedBytes = await newPdf.save({
        useObjectStreams: true,
      });
      setProgress(95);

      const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' });
      setCompressedSize(blob.size);
      const url = URL.createObjectURL(blob);
      setCompressedPdfUrl(url);
      setProgress(100);

      const reduction = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
      
      toast({
        title: "Success!",
        description: `PDF compressed by ${reduction}%`,
      });
    } catch (error) {
      console.error('Compression error:', error);
      toast({
        title: "Error",
        description: "Failed to compress PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadCompressedPdf = () => {
    if (compressedPdfUrl) {
      const a = document.createElement('a');
      a.href = compressedPdfUrl;
      a.download = file ? `compressed-${file.name}` : 'compressed.pdf';
      a.click();
    }
  };

  const uploadNew = () => {
    removeFile();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Compress PDF Online</h1>
            <p className="text-muted-foreground text-lg">
              Reduce PDF file size while maintaining quality
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {!compressedPdfUrl ? (
                <>
                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Minimize2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={removeFile}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {processing && (
                        <div>
                          <Progress value={progress} className="mb-2" />
                          <p className="text-sm text-center text-muted-foreground">
                            Compressing PDF... {Math.round(progress)}%
                          </p>
                        </div>
                      )}

                      {!processing && (
                        <div className="text-center">
                          <Button onClick={compressPdf} size="lg">
                            Compress PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Minimize2 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">PDF Compressed Successfully!</h3>
                    <p className="text-muted-foreground mb-4">Your compressed PDF is ready</p>
                    <div className="inline-flex items-center gap-8 bg-secondary px-6 py-4 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Original</p>
                        <p className="text-lg font-semibold">{formatFileSize(originalSize)}</p>
                      </div>
                      <div className="text-2xl text-muted-foreground">→</div>
                      <div>
                        <p className="text-sm text-muted-foreground">Compressed</p>
                        <p className="text-lg font-semibold text-primary">{formatFileSize(compressedSize)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Saved</p>
                        <p className="text-lg font-semibold text-green-600">
                          {((originalSize - compressedSize) / originalSize * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={downloadCompressedPdf} size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download Compressed PDF
                    </Button>
                    <Button onClick={uploadNew} variant="outline" size="lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Compress Another PDF
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
                    Click the upload area or drag and drop the PDF file you want to compress.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Compress</AccordionTrigger>
                  <AccordionContent>
                    Click "Compress PDF" to reduce the file size. The tool will optimize your PDF while maintaining visual quality.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Download</AccordionTrigger>
                  <AccordionContent>
                    Once compression is complete, you'll see the size reduction percentage. Download your compressed PDF and use it anywhere.
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
                  <AccordionTrigger>Is PDF compression free?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Our PDF compression tool is completely free with no file size limitations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Will compression affect PDF quality?</AccordionTrigger>
                  <AccordionContent>
                    Our tool uses smart compression techniques to reduce file size while maintaining visual quality. Most PDFs can be reduced by 10-40% without noticeable quality loss.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Is my PDF data safe?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! All compression happens locally in your browser. Your PDF never leaves your device, ensuring complete privacy and security.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>How much can I compress a PDF?</AccordionTrigger>
                  <AccordionContent>
                    Compression results vary depending on the content. PDFs with many images can be compressed more than text-only PDFs. Typical compression ranges from 10-40%.
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

export default CompressPdf;
