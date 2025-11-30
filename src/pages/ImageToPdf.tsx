import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { jsPDF } from "jspdf";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, FileText, Download, X, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const ImageToPdf = () => {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== acceptedFiles.length) {
      toast({
        title: "Invalid files",
        description: "Please upload only image files",
        variant: "destructive",
      });
    }
    setImages(prev => [...prev, ...imageFiles]);
    setPdfUrl(null);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
    },
    multiple: true,
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPdfUrl(null);
  };

  const convertToPdf = async () => {
    if (images.length === 0) {
      toast({
        title: "No images",
        description: "Please upload at least one image",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        const imageFile = images[i];
        
        // Read image as data URL
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(imageFile);
        });

        // Create image element to get dimensions
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = imageData;
        });

        // Calculate dimensions to fit page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgAspect = img.width / img.height;
        const pageAspect = pageWidth / pageHeight;

        let imgWidth = pageWidth;
        let imgHeight = pageHeight;

        if (imgAspect > pageAspect) {
          imgHeight = pageWidth / imgAspect;
        } else {
          imgWidth = pageHeight * imgAspect;
        }

        // Add new page if not first image
        if (i > 0) {
          pdf.addPage();
        }

        // Center image on page
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
        setProgress(((i + 1) / images.length) * 100);
      }

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      toast({
        title: "Success!",
        description: `${images.length} image(s) converted to PDF`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert images to PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadPdf = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'images.pdf';
      a.click();
    }
  };

  const uploadNew = () => {
    setImages([]);
    setPdfUrl(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Image to PDF Converter</h1>
            <p className="text-muted-foreground text-lg">
              Convert multiple images to a single PDF document
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {!pdfUrl ? (
                <>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Images className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2">
                      {isDragActive ? "Drop images here" : "Drag & drop images here"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">or click to select files</p>
                    <Button variant="secondary">Select Images</Button>
                  </div>

                  {images.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="font-semibold mb-3">Selected Images ({images.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={image.name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeImage(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {image.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {processing && (
                    <div className="mt-6">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Converting to PDF... {Math.round(progress)}%
                      </p>
                    </div>
                  )}

                  {images.length > 0 && !processing && (
                    <div className="mt-6 text-center">
                      <Button onClick={convertToPdf} size="lg">
                        Convert {images.length} Image(s) to PDF
                      </Button>
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
                      {images.length} image(s) converted to PDF
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={downloadPdf} size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={uploadNew} variant="outline" size="lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Convert New Images
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
                  <AccordionTrigger>Step 1: Upload Images</AccordionTrigger>
                  <AccordionContent>
                    Click the upload area or drag and drop multiple image files (PNG, JPG, GIF, WebP, BMP). You can upload as many images as you need.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Arrange & Review</AccordionTrigger>
                  <AccordionContent>
                    Review your selected images. Each image will become a separate page in the PDF in the order shown. Remove any images you don't want by hovering and clicking the X button.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Convert & Download</AccordionTrigger>
                  <AccordionContent>
                    Click "Convert to PDF" to create your PDF file. Each image will be fitted to its own page. Once complete, download your PDF.
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
                  <AccordionTrigger>What image formats are supported?</AccordionTrigger>
                  <AccordionContent>
                    We support PNG, JPG/JPEG, GIF, WebP, and BMP image formats. All common image types can be converted to PDF.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>How many images can I convert at once?</AccordionTrigger>
                  <AccordionContent>
                    There's no strict limit on the number of images. However, converting very large numbers of high-resolution images may take longer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Are my images secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes! All conversion happens locally in your browser. Your images are never uploaded to any server, ensuring complete privacy.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Will image quality be preserved?</AccordionTrigger>
                  <AccordionContent>
                    Yes, images are embedded in the PDF at their original quality. Each image is automatically scaled to fit on its own PDF page while maintaining aspect ratio.
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

export default ImageToPdf;
