import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const JpegToPng = () => {
  const [images, setImages] = useState<Array<{ img: HTMLImageElement; name: string; converted: string }>>([]);
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
    const jpegFiles = files.filter(f => f.type === "image/jpeg" || f.type === "image/jpg");
    if (jpegFiles.length > 0) {
      loadImages(jpegFiles);
    } else {
      toast.error("Please drop JPEG image files");
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
          const converted = convertImage(img);
          setImages(prev => [...prev, { img, name: file.name, converted }]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Loading ${files.length} image(s)`);
  };

  const convertImage = (img: HTMLImageElement): string => {
    if (!canvasRef.current) return "";

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL("image/png");
  };

  const downloadImage = (converted: string, name: string) => {
    const link = document.createElement("a");
    link.href = converted;
    link.download = name.replace(/\.\w+$/, ".png");
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
              <CardTitle>JPEG to PNG Converter</CardTitle>
              <CardDescription>
                Convert JPEG images to PNG format (lossless)
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
                    Drag & drop your JPEG images here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files (multiple files supported)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                </div>
              )}

              {images.length > 0 && (
                <div className="space-y-6 animate-in fade-in duration-500">
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
              <CardTitle className="text-lg">How to Use JPEG to PNG Converter</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your JPEG image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Preview your converted PNG image instantly</p>
                    <p><strong>3.</strong> Click "Download PNG" to save your lossless PNG image</p>
                    <p><strong>4.</strong> Use "Upload New" to convert another image</p>
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
                  <AccordionTrigger>Why convert JPEG to PNG?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    PNG is a lossless format, meaning no quality is lost during conversion. It's ideal for images that need editing, graphics with text, or when you need transparency support in the future.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Will the file size increase?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, PNG files are typically larger than JPEG because PNG uses lossless compression while JPEG uses lossy compression. This is the tradeoff for maintaining perfect quality.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Will image quality improve?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No, converting JPEG to PNG won't restore quality lost during the original JPEG compression. However, it prevents further quality loss from additional editing or conversions.
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

export default JpegToPng;
