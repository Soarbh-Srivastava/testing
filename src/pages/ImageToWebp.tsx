import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const ImageToWebp = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState([90]);
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
        convertImage(img, quality[0]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const convertImage = (img: HTMLImageElement, qualityValue: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const webpData = canvas.toDataURL("image/webp", qualityValue / 100);
    setConvertedImage(webpData);
    toast.success("Converted to WebP");
  };

  const handleQualityChange = (value: number[]) => {
    setQuality(value);
    if (image) {
      convertImage(image, value[0]);
    }
  };

  const downloadImage = () => {
    if (!convertedImage) return;

    const link = document.createElement("a");
    link.href = convertedImage;
    link.download = "converted-image.webp";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setConvertedImage(null);
    setQuality([90]);
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
              <CardTitle>Image to WebP Converter</CardTitle>
              <CardDescription>
                Convert any image to WebP format for better compression
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

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quality: {quality[0]}%
                    </label>
                    <Slider
                      value={quality}
                      onValueChange={handleQualityChange}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      WebP offers better compression than JPEG at similar quality
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download WebP
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
              <CardTitle className="text-lg">How to Use Image to WebP Converter</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image (any format) by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Preview your WebP conversion instantly</p>
                    <p><strong>3.</strong> Adjust the quality slider (1-100%) to balance file size and quality</p>
                    <p><strong>4.</strong> Click "Download WebP" to save your modern format image</p>
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
                  <AccordionTrigger>Why use WebP format?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    WebP provides superior compression compared to JPEG and PNG, typically 25-35% smaller file sizes at the same quality. It supports both lossy and lossless compression, plus transparency and animation.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Is WebP supported by all browsers?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! WebP is now supported by all modern browsers including Chrome, Firefox, Safari (14+), Edge, and Opera. It's safe to use for web applications in 2025.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>What quality setting should I use?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For web use, 80-90% quality is recommended for excellent visual quality with great compression. Use 90-100% for high-quality needs, and 60-80% for maximum size reduction.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Is my image uploaded to a server?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No! All conversion happens 100% in your browser. Your images never leave your device, ensuring complete privacy and security.
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

export default ImageToWebp;
