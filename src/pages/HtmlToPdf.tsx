import { useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Upload, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const HtmlToPdf = () => {
  const [htmlContent, setHtmlContent] = useState(`<div style="padding: 40px; font-family: Arial, sans-serif;">
  <h1 style="color: #333;">Sample HTML Document</h1>
  <p style="font-size: 16px; line-height: 1.6;">
    This is a sample HTML content that will be converted to PDF. 
    You can edit this content and see the live preview on the right.
  </p>
  <ul>
    <li>Supports HTML formatting</li>
    <li>Preserves styles and layout</li>
    <li>Easy to use and customize</li>
  </ul>
</div>`);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const convertToPdf = async () => {
    if (!htmlContent.trim()) {
      toast({
        title: "No content",
        description: "Please enter HTML content to convert",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Create a temporary div to render HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);
      setProgress(25);

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      setProgress(60);

      // Remove temp div
      document.body.removeChild(tempDiv);

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      setProgress(90);

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setProgress(100);

      toast({
        title: "Success!",
        description: "HTML converted to PDF successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert HTML to PDF. Please try again.",
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
      a.download = 'document.pdf';
      a.click();
    }
  };

  const resetTool = () => {
    setPdfUrl(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">HTML to PDF Converter</h1>
            <p className="text-muted-foreground text-lg">
              Convert HTML content to PDF with live preview
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">HTML Editor</h2>
                </div>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                    setPdfUrl(null);
                  }}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="Enter your HTML content here..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
                <div 
                  className="border rounded-lg p-6 min-h-[400px] bg-white"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {!pdfUrl ? (
                <div className="space-y-6">
                  {processing && (
                    <div>
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Converting to PDF... {Math.round(progress)}%
                      </p>
                    </div>
                  )}

                  {!processing && (
                    <div className="text-center">
                      <Button onClick={convertToPdf} size="lg">
                        Convert to PDF
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Code className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">PDF Created Successfully!</h3>
                    <p className="text-muted-foreground">Your PDF is ready to download</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={downloadPdf} size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={resetTool} variant="outline" size="lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Convert New HTML
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
                  <AccordionTrigger>Step 1: Enter HTML Content</AccordionTrigger>
                  <AccordionContent>
                    Type or paste your HTML content in the editor on the left. You can use any HTML tags and inline CSS styles.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Preview Your Content</AccordionTrigger>
                  <AccordionContent>
                    The live preview on the right shows exactly how your HTML will appear in the final PDF. Make any adjustments needed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Convert & Download</AccordionTrigger>
                  <AccordionContent>
                    Click "Convert to PDF" to generate your PDF file. Once ready, download it and use it anywhere.
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
                  <AccordionTrigger>What HTML features are supported?</AccordionTrigger>
                  <AccordionContent>
                    The tool supports most HTML tags and inline CSS styles. For best results, use inline styles rather than external CSS files.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Can I use external images?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can include images using img tags with URLs. However, data URLs (base64 encoded images) work more reliably.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Is my HTML content secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes! All conversion happens locally in your browser. Your HTML content is never sent to any server.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>What PDF size is generated?</AccordionTrigger>
                  <AccordionContent>
                    The tool generates A4 size PDFs (210mm x 297mm). The content is automatically scaled to fit the page width.
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

export default HtmlToPdf;
