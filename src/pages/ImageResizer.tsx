import { useState, useRef } from "react";
import { Upload, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const ImageResizer = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
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
        setWidth(img.width);
        setHeight(img.height);
        setAspectRatio(img.width / img.height);
        setResizedImage(null);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleWidthChange = (value: number) => {
    setWidth(value);
    if (maintainAspectRatio && value > 0) {
      setHeight(Math.round(value / aspectRatio));
    }
  };

  const handleHeightChange = (value: number) => {
    setHeight(value);
    if (maintainAspectRatio && value > 0) {
      setWidth(Math.round(value * aspectRatio));
    }
  };

  const resizeImage = () => {
    if (!image || !canvasRef.current || width <= 0 || height <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const resizedData = canvas.toDataURL("image/png");
    setResizedImage(resizedData);
    toast.success("Image resized");
  };

  const downloadImage = () => {
    if (!resizedImage) return;

    const link = document.createElement("a");
    link.href = resizedImage;
    link.download = "resized-image.png";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setResizedImage(null);
    setWidth(0);
    setHeight(0);
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
              <CardTitle>Image Resizer</CardTitle>
              <CardDescription>
                Resize images to custom dimensions
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

              {image && !resizedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <img
                    src={image.src}
                    alt="Original"
                    className="max-w-full rounded-lg shadow-lg"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="width">Width (px)</Label>
                      <Input
                        id="width"
                        type="number"
                        value={width}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aspect-ratio"
                      checked={maintainAspectRatio}
                      onCheckedChange={(checked) =>
                        setMaintainAspectRatio(checked as boolean)
                      }
                    />
                    <Label htmlFor="aspect-ratio" className="cursor-pointer">
                      Maintain aspect ratio
                    </Label>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={resizeImage} className="flex-1" size="lg">
                      Resize Image
                    </Button>
                    <Button onClick={reset} variant="outline" size="lg">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              {resizedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <img
                    src={resizedImage}
                    alt="Resized"
                    className="max-w-full rounded-lg shadow-lg"
                  />

                  <div className="flex gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download Resized Image
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
              <CardTitle className="text-lg">How to Use Image Resizer</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Current dimensions are shown in the width and height fields</p>
                    <p><strong>3.</strong> Enter your desired width or height in pixels</p>
                    <p><strong>4.</strong> Toggle "Maintain aspect ratio" to keep proportions or resize freely</p>
                    <p><strong>5.</strong> Click "Resize Image" to process</p>
                    <p><strong>6.</strong> Preview the resized result</p>
                    <p><strong>7.</strong> Click "Download Resized Image" to save</p>
                    <p><strong>8.</strong> Use "Upload New" to resize another image</p>
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
                  <AccordionTrigger>What does "Maintain aspect ratio" do?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    When enabled, changing width automatically adjusts height (and vice versa) to keep the image proportions. Disable it to stretch or compress the image to exact custom dimensions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Will resizing affect image quality?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Resizing down (making smaller) generally maintains good quality. Resizing up (making larger) may cause pixelation or blur since you're stretching the original pixels. For best results, start with high-resolution images.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>What's the maximum size I can resize to?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Browser canvas limitations typically allow up to 4096x4096 pixels, though this varies by browser. Very large images may also cause performance issues.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Is my image data secure?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! All resizing happens locally in your browser. Your images are never uploaded to any server, ensuring 100% privacy and security.
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

export default ImageResizer;
