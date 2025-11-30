import { useState, useRef, useCallback } from "react";
import { Upload, Download, X, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const ImageCropper = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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
        setCroppedImage(null);
        setCropArea({
          x: img.width * 0.1,
          y: img.height * 0.1,
          width: img.width * 0.6,
          height: img.height * 0.6,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "move") {
      setIsMoving(true);
    } else {
      setIsResizing(type);
    }
    setStartPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isResizing && !isMoving) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      setStartPos({ x: e.clientX, y: e.clientY });

      if (isMoving) {
        setCropArea((prev) => ({
          ...prev,
          x: Math.max(0, Math.min(prev.x + deltaX, (image?.width || 0) - prev.width)),
          y: Math.max(0, Math.min(prev.y + deltaY, (image?.height || 0) - prev.height)),
        }));
      } else if (isResizing) {
        setCropArea((prev) => {
          const newArea = { ...prev };

          if (isResizing.includes("e")) {
            newArea.width = Math.max(50, prev.width + deltaX);
          }
          if (isResizing.includes("w")) {
            const newWidth = Math.max(50, prev.width - deltaX);
            newArea.x = prev.x + (prev.width - newWidth);
            newArea.width = newWidth;
          }
          if (isResizing.includes("s")) {
            newArea.height = Math.max(50, prev.height + deltaY);
          }
          if (isResizing.includes("n")) {
            const newHeight = Math.max(50, prev.height - deltaY);
            newArea.y = prev.y + (prev.height - newHeight);
            newArea.height = newHeight;
          }

          newArea.x = Math.max(0, Math.min(newArea.x, (image?.width || 0) - newArea.width));
          newArea.y = Math.max(0, Math.min(newArea.y, (image?.height || 0) - newArea.height));

          return newArea;
        });
      }
    },
    [isResizing, isMoving, startPos, image]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
    setIsMoving(false);
  }, []);

  const cropImage = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    );

    const croppedData = canvas.toDataURL("image/png");
    setCroppedImage(croppedData);
    toast.success("Image cropped");
  };

  const downloadImage = () => {
    if (!croppedImage) return;

    const link = document.createElement("a");
    link.href = croppedImage;
    link.download = "cropped-image.png";
    link.click();
    toast.success("Image downloaded");
  };

  const reset = () => {
    setImage(null);
    setCroppedImage(null);
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
              <CardTitle>Image Cropper</CardTitle>
              <CardDescription>
                Crop images with a resizable and draggable selection area
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

              {image && !croppedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div
                    ref={imageContainerRef}
                    className="relative inline-block max-w-full"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img src={image.src} alt="Original" className="max-w-full rounded-lg" />

                    <div
                      className="absolute border-2 border-primary bg-primary/10"
                      style={{
                        left: `${cropArea.x}px`,
                        top: `${cropArea.y}px`,
                        width: `${cropArea.width}px`,
                        height: `${cropArea.height}px`,
                        cursor: isMoving ? "grabbing" : "grab",
                      }}
                      onMouseDown={(e) => handleMouseDown(e, "move")}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <Move className="w-6 h-6 text-primary" />
                      </div>

                      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((pos) => (
                        <div
                          key={pos}
                          className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full"
                          style={{
                            cursor: `${pos}-resize`,
                            ...(pos.includes("n") && { top: "-6px" }),
                            ...(pos.includes("s") && { bottom: "-6px" }),
                            ...(pos.includes("w") && { left: "-6px" }),
                            ...(pos.includes("e") && { right: "-6px" }),
                            ...(!pos.includes("n") && !pos.includes("s") && { top: "50%", transform: "translateY(-50%)" }),
                            ...(!pos.includes("w") && !pos.includes("e") && { left: "50%", transform: "translateX(-50%)" }),
                          }}
                          onMouseDown={(e) => handleMouseDown(e, pos)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={cropImage} className="flex-1" size="lg">
                      Crop Image
                    </Button>
                    <Button onClick={reset} variant="outline" size="lg">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              {croppedImage && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <img
                    src={croppedImage}
                    alt="Cropped"
                    className="max-w-full rounded-lg shadow-lg"
                  />

                  <div className="flex gap-4">
                    <Button onClick={downloadImage} className="flex-1" size="lg">
                      <Download className="w-5 h-5 mr-2" />
                      Download Cropped Image
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
              <CardTitle className="text-lg">How to Use Image Cropper</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Step-by-Step Guide</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-muted-foreground">
                    <p><strong>1.</strong> Upload your image by dragging & dropping or clicking to browse</p>
                    <p><strong>2.</strong> A resizable crop frame will appear on your image</p>
                    <p><strong>3.</strong> Drag the frame to move it around your image</p>
                    <p><strong>4.</strong> Drag the corner and edge handles to resize the crop area</p>
                    <p><strong>5.</strong> Click "Crop Image" to process your selection</p>
                    <p><strong>6.</strong> Preview the cropped result</p>
                    <p><strong>7.</strong> Click "Download Cropped Image" to save</p>
                    <p><strong>8.</strong> Use "Upload New" to crop another image</p>
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
                  <AccordionTrigger>How do I resize the crop area?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Click and drag any of the 8 handles (corners and edges) around the crop frame. The frame is fully resizable in all directions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>How do I move the crop area?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Click and drag anywhere inside the crop frame (where the move icon appears) to reposition it over different parts of your image.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Can I crop to specific dimensions?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Currently, the cropper supports freeform selection. Resize the frame manually to approximate your desired dimensions. The final dimensions are shown after cropping.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Is my image uploaded to a server?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No! All cropping happens 100% in your browser using HTML5 Canvas. Your images never leave your device, ensuring complete privacy.
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

export default ImageCropper;
