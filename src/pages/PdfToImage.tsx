import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, Image as ImageIcon, Download, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractedImage {
  dataUrl: string;
  pageNumber: number;
}

const PdfToImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0];
    if (pdfFile && pdfFile.type === 'application/pdf') {
      setFile(pdfFile);
      setImages([]);
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
    setImages([]);
  };

  const convertToImages = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const extractedImages: ExtractedImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

          const dataUrl = canvas.toDataURL('image/png');
          extractedImages.push({
            dataUrl,
            pageNumber: i,
          });
        }

        setProgress((i / numPages) * 100);
      }

      setImages(extractedImages);
      toast({
        title: "Success!",
        description: `Extracted ${numPages} page(s) as images`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to convert PDF to images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = (dataUrl: string, pageNumber: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `page-${pageNumber}.png`;
    a.click();
  };

  const downloadAllImages = () => {
    images.forEach((image) => {
      setTimeout(() => {
        downloadImage(image.dataUrl, image.pageNumber);
      }, 100 * image.pageNumber);
    });
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
            <h1 className="text-4xl font-bold mb-4">PDF to Image Converter</h1>
            <p className="text-muted-foreground text-lg">
              Extract PDF pages as high-quality PNG images
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {images.length === 0 ? (
                <>
                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
                          <FileImage className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
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
                            Converting pages to images... {Math.round(progress)}%
                          </p>
                        </div>
                      )}

                      {!processing && (
                        <div className="text-center">
                          <Button onClick={convertToImages} size="lg">
                            Convert to Images
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Conversion Complete!
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {images.length} page(s) extracted as PNG images
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={downloadAllImages} size="lg">
                        <Download className="w-4 h-4 mr-2" />
                        Download All Images
                      </Button>
                      <Button onClick={uploadNew} variant="outline" size="lg">
                        <Upload className="w-4 h-4 mr-2" />
                        Convert Another PDF
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {images.map((image) => (
                      <Card key={image.pageNumber}>
                        <CardContent className="pt-6">
                          <img
                            src={image.dataUrl}
                            alt={`Page ${image.pageNumber}`}
                            className="w-full h-auto rounded-lg mb-3 border"
                          />
                          <div className="flex items-center justify-between">
                            <p className="font-medium">Page {image.pageNumber}</p>
                            <Button
                              size="sm"
                              onClick={() => downloadImage(image.dataUrl, image.pageNumber)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                    Click the upload area or drag and drop the PDF file you want to convert to images.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Convert</AccordionTrigger>
                  <AccordionContent>
                    Click "Convert to Images" to extract each page as a separate PNG image. The tool will process all pages automatically.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Download</AccordionTrigger>
                  <AccordionContent>
                    Preview all extracted images and download them individually or all at once using the "Download All Images" button.
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
                  <AccordionTrigger>What image format is used?</AccordionTrigger>
                  <AccordionContent>
                    All pages are extracted as high-quality PNG images with transparency support. PNG format ensures the best quality for text and graphics.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Is there a page limit?</AccordionTrigger>
                  <AccordionContent>
                    No, you can convert PDFs with any number of pages. However, very large PDFs may take longer to process depending on your device.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Is my PDF secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes! All conversion happens locally in your browser. Your PDF never leaves your device, ensuring complete privacy and security.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>What resolution are the images?</AccordionTrigger>
                  <AccordionContent>
                    Images are exported at 2x scale (high resolution) to ensure clarity and quality. This makes them suitable for printing and professional use.
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

export default PdfToImage;
