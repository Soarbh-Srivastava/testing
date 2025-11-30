import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const PngToJpeg = () => {
  const [images, setImages] = useState<Array<{ img: HTMLImageElement; name: string; converted: string }>>([]);
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
    const files = Array.from(e.dataTransfer.files);
    const pngFiles = files.filter(f => f.type === "image/png");
    if (pngFiles.length > 0) {
      loadImages(pngFiles);
    } else {
      toast.error("Please drop PNG image files");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      loadImages(Array.from(files));
    }
  };

  const loadImages = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const converted = convertImage(img, quality[0]);
          setImages(prev => [...prev, { img, name: file.name, converted }]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Loading ${files.length} image(s)`);
  };

  const convertImage = (img: HTMLImageElement, qualityValue: number): string => {
    if (!canvasRef.current) return "";

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL("image/jpeg", qualityValue / 100);
  };

  const handleQualityChange = (value: number[]) => {
    setQuality(value);
    setImages(prev => prev.map(item => ({
      ...item,
      converted: convertImage(item.img, value[0])
    })));
  };

  const downloadImage = (converted: string, name: string) => {
    const link = document.createElement("a");
    link.href = converted;
    link.download = name.replace(/\.\w+$/, ".jpg");
    link.click();
    toast.success("Image downloaded");
  };

  const downloadAll = () => {
    images.forEach((item, index) => {
      setTimeout(() => downloadImage(item.converted, item.name), index * 100);
    });
    toast.success(`Downloading ${images.length} images`);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setImages([]);
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>PNG to JPEG Converter</CardTitle>
              <CardDescription>
                Convert PNG images to JPEG format with adjustable quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {images.length === 0 && (
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
                    Drag & drop your PNG images here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files (multiple files supported)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                </div>
              )}

              {images.length > 0 && (
                <div className="space-y-6 animate-in fade-in duration-500">
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
                      Higher quality = larger file size
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {images.map((item, index) => (
                      <div key={index} className="relative border rounded-lg p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 z-10"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <img
                          src={item.converted}
                          alt={item.name}
                          className="w-full rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={downloadAll} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download All ({images.length})
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
              <CardTitle className="text-lg">How to Use PNG to JPEG Converter</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your PNG image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Preview your converted JPEG image instantly</p>
                    <p><strong>3.</strong> Adjust the quality slider (1-100%) to balance file size and image quality</p>
                    <p><strong>4.</strong> Click "Download JPEG" to save your converted image</p>
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
                  <AccordionTrigger>Why convert PNG to JPEG?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    JPEG files are typically smaller than PNG files, making them ideal for web use and sharing. However, JPEG uses lossy compression, so it's best for photos rather than graphics with text or sharp edges.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>What quality setting should I use?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For most photos, 80-90% quality provides an excellent balance between file size and visual quality. Use 90-100% for high-quality images and 60-80% for web optimization.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Will I lose image transparency?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, JPEG doesn't support transparency. Transparent areas in your PNG will be converted to white background. If you need transparency, consider using PNG or WebP format instead.
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

export default PngToJpeg;
