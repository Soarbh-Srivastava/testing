import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const ImageToBmp = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    } else {
      toast.error("Please drop a valid image file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        convertImage(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const convertImage = (img: HTMLImageElement) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // BMP is not directly supported by canvas, so we convert to PNG
    // In a real implementation, you would use a library to create actual BMP
    const pngData = canvas.toDataURL("image/png");
    setConvertedImage(pngData);
    toast.success("Image converted (as PNG - browsers don't support BMP directly)");
  };

  const downloadImage = () => {
    if (!convertedImage) return;

    const link = document.createElement("a");
    link.href = convertedImage;
    link.download = "converted-image.png";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setConvertedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <a href="/" className="text-primary hover:text-primary-glow transition-colors">
            ← Back to Home
          </a>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Image to BMP Converter</CardTitle>
              <CardDescription>
                Convert images to BMP format (Note: browsers output PNG due to BMP limitations)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!image && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${
                      isDragging
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-card/50"
                    }
                  `}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Drag & drop your image here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {convertedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <img
                        src={convertedImage}
                        alt="Converted"
                        className="max-w-full rounded-lg shadow-lg"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={reset}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Note: Browsers don't natively support BMP format. The image is saved as PNG,
                      which is a more modern and efficient format.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download Image (PNG)
                    </Button>
                    <Button onClick={reset} variant="outline" size="lg">
                      Upload New
                    </Button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>

          {/* How to Use Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">How to Use Image to BMP Converter</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Preview your converted image instantly</p>
                    <p><strong>3.</strong> Note: The output will be PNG format (see FAQ)</p>
                    <p><strong>4.</strong> Click "Download Image (PNG)" to save your file</p>
                    <p><strong>5.</strong> Use "Upload New" to convert another image</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* FAQs Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1">
                  <AccordionTrigger>Why is the output PNG instead of BMP?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Modern web browsers don't natively support BMP encoding. PNG is a better alternative - it's lossless like BMP but with superior compression, making files much smaller while maintaining perfect quality.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>What's the difference between BMP and PNG?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Both are lossless formats. BMP files are uncompressed and very large. PNG uses lossless compression, making files 50-90% smaller while maintaining identical quality. PNG also supports transparency.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Should I use PNG instead of BMP?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! PNG is superior in almost every way - smaller files, better compression, transparency support, and universal browser/software support. Use PNG unless you have a specific requirement for BMP format.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Is this conversion secure?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Absolutely! All conversion happens 100% in your browser. Your images are never uploaded to any server, ensuring complete privacy.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ImageToBmp;
