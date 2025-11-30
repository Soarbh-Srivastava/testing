import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const ImageCompressor = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState([80]);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
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
    setOriginalSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        compressImage(img, quality[0]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (img: HTMLImageElement, qualityValue: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const compressed = canvas.toDataURL("image/jpeg", qualityValue / 100);
    setCompressedImage(compressed);

    const base64Length = compressed.length - "data:image/jpeg;base64,".length;
    const sizeInBytes = (base64Length * 3) / 4;
    setCompressedSize(sizeInBytes);
    toast.success("Image compressed");
  };

  const handleQualityChange = (value: number[]) => {
    setQuality(value);
    if (image) {
      compressImage(image, value[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const downloadImage = () => {
    if (!compressedImage) return;

    const link = document.createElement("a");
    link.href = compressedImage;
    link.download = "compressed-image.jpg";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setCompressedImage(null);
    setQuality([80]);
    setOriginalSize(0);
    setCompressedSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const compressionRatio =
    originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0;

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
              <CardTitle>Image Compressor</CardTitle>
              <CardDescription>
                Reduce image file size while maintaining quality
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

              {compressedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <img
                        src={compressedImage}
                        alt="Compressed"
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

                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Original</p>
                      <p className="text-lg font-semibold">{formatFileSize(originalSize)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                      <p className="text-lg font-semibold">{formatFileSize(compressedSize)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Saved</p>
                      <p className="text-lg font-semibold text-primary">{compressionRatio}%</p>
                    </div>
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
                      Lower quality = smaller file size
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download Compressed Image
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
              <CardTitle className="text-lg">How to Use Image Compressor</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Preview your compressed image with compression stats</p>
                    <p><strong>3.</strong> Adjust the quality slider to find your perfect balance</p>
                    <p><strong>4.</strong> See real-time file size comparison and savings percentage</p>
                    <p><strong>5.</strong> Click "Download Compressed Image" to save your optimized file</p>
                    <p><strong>6.</strong> Use "Upload New" to compress another image</p>
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
                  <AccordionTrigger>How much can I compress an image?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Compression depends on the image content and quality setting. Typically, you can reduce file size by 50-80% while maintaining good visual quality at 70-80% quality setting.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>What's the best quality setting?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For web use, 70-80% quality is recommended. For printing or high-quality needs, use 85-95%. For maximum compression with acceptable quality, try 50-70%.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Will compression affect image quality?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, compression uses lossy encoding which reduces file size by removing some image data. The quality slider lets you control this tradeoff - higher compression = smaller file but lower quality.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Is my image data safe?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! All compression happens locally in your browser. Your images are never uploaded to any server, ensuring 100% privacy and security.
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

export default ImageCompressor;
