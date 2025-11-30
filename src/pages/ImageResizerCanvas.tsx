import { useState, useRef, useEffect } from "react";
import { Upload, Download, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { Canvas as FabricCanvas, Image as FabricImage } from "fabric";

const ImageResizerCanvas = () => {
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [hasImage, setHasImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setWidth(canvasWidth);
      fabricCanvas.setHeight(canvasHeight);
      fabricCanvas.renderAll();
    }
  }, [canvasWidth, canvasHeight, fabricCanvas]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    } else {
      toast.error("Please select a valid image file");
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        if (!fabricCanvas) return;

        // Scale image to fit canvas while maintaining aspect ratio
        const scaleX = canvasWidth / img.width!;
        const scaleY = canvasHeight / img.height!;
        const scale = Math.min(scaleX, scaleY, 1);

        img.scale(scale);
        img.set({
          left: (canvasWidth - img.width! * scale) / 2,
          top: (canvasHeight - img.height! * scale) / 2,
        });

        fabricCanvas.clear();
        fabricCanvas.backgroundColor = "#ffffff";
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        setHasImage(true);
        toast.success("Image loaded");
      });
    };
    reader.readAsDataURL(file);
  };

  const zoomIn = () => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      const currentScale = activeObject.scaleX || 1;
      activeObject.scale(currentScale * 1.1);
      fabricCanvas.renderAll();
    }
  };

  const zoomOut = () => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      const currentScale = activeObject.scaleX || 1;
      activeObject.scale(currentScale * 0.9);
      fabricCanvas.renderAll();
    }
  };

  const fitToCanvas = () => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === "image") {
      const scaleX = canvasWidth / activeObject.width!;
      const scaleY = canvasHeight / activeObject.height!;
      const scale = Math.min(scaleX, scaleY);
      
      activeObject.scale(scale);
      activeObject.set({
        left: (canvasWidth - activeObject.width! * scale) / 2,
        top: (canvasHeight - activeObject.height! * scale) / 2,
      });
      fabricCanvas.renderAll();
    }
  };

  const downloadImage = () => {
    if (!fabricCanvas || !hasImage) return;

    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "resized-image.png";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#ffffff";
      fabricCanvas.renderAll();
    }
    setHasImage(false);
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

        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Image Resizer Canvas</CardTitle>
              <CardDescription>
                Edit and resize images in a fixed canvas with drag & scale controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="canvas-width">Canvas Width (px)</Label>
                  <Input
                    id="canvas-width"
                    type="number"
                    value={canvasWidth}
                    onChange={(e) => setCanvasWidth(Number(e.target.value) || 800)}
                    min="100"
                    max="2000"
                  />
                </div>
                <div>
                  <Label htmlFor="canvas-height">Canvas Height (px)</Label>
                  <Input
                    id="canvas-height"
                    type="number"
                    value={canvasHeight}
                    onChange={(e) => setCanvasHeight(Number(e.target.value) || 600)}
                    min="100"
                    max="2000"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                {hasImage && (
                  <>
                    <Button onClick={zoomIn} variant="outline" size="icon">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button onClick={zoomOut} variant="outline" size="icon">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button onClick={fitToCanvas} variant="outline" size="icon">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="border border-border rounded-lg p-4 bg-muted/10 overflow-auto">
                <canvas ref={canvasRef} className="border border-border shadow-lg mx-auto" />
              </div>

              {hasImage && (
                <div className="flex gap-4">
                  <Button onClick={downloadImage} className="flex-1" size="lg">
                    <Download className="w-5 h-5 mr-2" />
                    Download Resized Image
                  </Button>
                  <Button onClick={reset} variant="outline" size="lg">
                    <X className="w-5 h-5 mr-2" />
                    Clear Canvas
                  </Button>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>How to use:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Set your desired canvas dimensions</li>
                  <li>Upload an image using the Upload button</li>
                  <li>Drag the image to reposition it</li>
                  <li>Use corner handles to scale the image</li>
                  <li>Use zoom buttons for fine control</li>
                  <li>Download when satisfied with the result</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ImageResizerCanvas;
