import { useState, useRef } from "react";
import { Upload, Download, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { pipeline, env } from '@huggingface/transformers';
import Footer from "@/components/Footer";

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

type RemovalMethod = "ai" | "fast";

const MAX_IMAGE_DIMENSION = 1024;

const BackgroundRemover = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [tolerance, setTolerance] = useState([30]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<RemovalMethod>("ai");
  const [progress, setProgress] = useState(0);
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
        setProcessedImage(null);
        toast.success("Image loaded successfully");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  const colorDistance = (
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ) => {
    return Math.sqrt(
      Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
    );
  };

  const resizeImageIfNeeded = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      return true;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0);
    return false;
  };

  const processWithAI = async () => {
    if (!image || !canvasRef.current) return;

    try {
      setProgress(20);
      const segmenter = await pipeline('image-segmentation', 'Xenova/rembg', {
        device: 'webgpu',
      });
      
      setProgress(40);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      const wasResized = resizeImageIfNeeded(canvas, ctx, image);
      if (wasResized) {
        console.log(`Image resized to ${canvas.width}x${canvas.height}`);
      }
      
      setProgress(60);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const result = await segmenter(imageData);
      
      setProgress(80);
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      outputCtx.drawImage(canvas, 0, 0);
      
      const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = outputImageData.data;
      
      for (let i = 0; i < result[0].mask.data.length; i++) {
        const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
        data[i * 4 + 3] = alpha;
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);
      setProgress(100);
      setProcessedImage(outputCanvas.toDataURL('image/png'));
      toast.success("Background removed successfully");
    } catch (error) {
      console.error('AI processing error:', error);
      toast.error("Failed to remove background. Try the Fast method instead.");
      throw error;
    }
  };

  const processWithChromaKey = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setProgress(33);
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    setProgress(66);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const targetColor = hexToRgb(backgroundColor);
    const toleranceValue = (tolerance[0] / 100) * 441.67;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = colorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);

      if (distance <= toleranceValue) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setProgress(100);
    setProcessedImage(canvas.toDataURL("image/png"));
    toast.success("Background removed successfully");
  };

  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      if (method === "ai") {
        await processWithAI();
      } else {
        processWithChromaKey();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "background-removed.png";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setProcessedImage(null);
    setBackgroundColor("#ffffff");
    setTolerance([30]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <a href="/" className="text-primary hover:text-primary/80 transition-colors">
            ← Back to Home
          </a>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Background Remover</CardTitle>
              <CardDescription>
                Remove backgrounds from images using advanced technology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
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
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
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

              {/* Method Selection & Controls */}
              {image && !processedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <img
                      src={image.src}
                      alt="Original"
                      className="max-w-full max-h-96 rounded-lg shadow-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={reset}
                      className="ml-4"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        Removal Method
                      </label>
                      <RadioGroup value={method} onValueChange={(v) => setMethod(v as RemovalMethod)}>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="ai" id="ai" />
                          <Label htmlFor="ai" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium">Smart Removal</div>
                              <div className="text-xs text-muted-foreground">Advanced algorithm for complex backgrounds</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="fast" id="fast" />
                          <Label htmlFor="fast" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Zap className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium">Fast Removal</div>
                              <div className="text-xs text-muted-foreground">Quick color-based removal for solid backgrounds</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className={method === "ai" ? "opacity-50 pointer-events-none" : ""}>
                      <label className="block text-sm font-medium mb-2">
                        Background Color {method === "ai" && "(Smart Removal selected)"}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="w-20 h-20 rounded-lg cursor-pointer border-4 border-primary shadow-lg hover:scale-105 transition-transform"
                            disabled={method === "ai"}
                            title="Click to pick a color"
                          />
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                            Pick Color
                          </div>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="w-full px-4 py-2 bg-input border border-input rounded-lg"
                            placeholder="#ffffff"
                            disabled={method === "ai"}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            or enter hex code
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {method === "ai" ? "Color picker is only used for Fast Removal method" : "Click the color box to pick the background color"}
                      </p>
                    </div>

                    <div className={method === "ai" ? "opacity-50 pointer-events-none" : ""}>
                      <label className="block text-sm font-medium mb-2">
                        Tolerance: {tolerance[0]}% {method === "ai" && "(Smart Removal selected)"}
                      </label>
                      <Slider
                        value={tolerance}
                        onValueChange={setTolerance}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={method === "ai"}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {method === "ai" ? "Tolerance is only used for Fast Removal method" : "Higher values remove more similar colors"}
                      </p>
                    </div>

                    {isProcessing && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm text-center text-muted-foreground">
                          {method === "ai" ? "Processing with advanced algorithm..." : "Removing background..."}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={processImage}
                      disabled={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? "Processing..." : "Remove Background"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {processedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                      }}
                    />
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="relative max-w-full max-h-96 rounded-lg shadow-lg mx-auto"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download Transparent PNG
                    </Button>
                    <Button onClick={reset} variant="outline" size="lg" className="sm:w-auto w-full">
                      Upload New
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden Canvas */}
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>

          {/* How to Use Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">How to Use Background Remover</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> Choose your removal method:</p>
                    <p className="ml-4">• <strong>Smart Removal:</strong> Best for complex backgrounds, portraits, and detailed images</p>
                    <p className="ml-4">• <strong>Fast Removal:</strong> Perfect for solid color backgrounds like green screens</p>
                    <p><strong>3.</strong> For Fast Removal: Select the background color and adjust tolerance (0-100%)</p>
                    <p><strong>4.</strong> Click "Remove Background" to process the image</p>
                    <p><strong>5.</strong> Preview the result with transparent background (checkerboard pattern)</p>
                    <p><strong>6.</strong> Click "Download Transparent PNG" to save your image</p>
                    <p><strong>7.</strong> Use "Upload New" to process another image</p>
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
                  <AccordionTrigger>Which method should I choose?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <strong>Smart Removal:</strong> Use for portraits, products, or images with complex backgrounds. It automatically detects the subject and removes the background precisely.
                    <br /><br />
                    <strong>Fast Removal:</strong> Best for images with solid or near-solid color backgrounds (green screen, white background, etc.). Requires manual color selection but processes instantly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>How does the tolerance slider work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The tolerance slider (available in Fast Removal mode) controls how similar colors need to be to the selected background color to be removed. Higher values (50-100%) remove more colors, while lower values (0-30%) remove only very similar colors. Start with 30% and adjust as needed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>What if my background has multiple colors?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For complex or multi-colored backgrounds, use the Smart Removal method which automatically detects and removes backgrounds. The Fast Removal method works best with solid color backgrounds. For gradients, you may need to increase the tolerance or use Smart Removal.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Why is the checkerboard pattern showing?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The checkerboard pattern indicates transparent areas in your image. It's not part of your final image - it's just a visual indicator to show where the background has been removed. Your downloaded PNG will have true transparency.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-5">
                  <AccordionTrigger>Is this tool private and secure?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Absolutely! All background removal processing happens 100% in your browser. Your images never leave your device or get uploaded to any server. Both removal methods process everything locally on your computer.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-6">
                  <AccordionTrigger>What image formats are supported?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You can upload JPG, PNG, WEBP, and most common image formats. The output is always a PNG file with transparency, which is the standard format for images with transparent backgrounds.
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

export default BackgroundRemover;