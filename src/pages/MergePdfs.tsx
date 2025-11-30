import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, FileText, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const MergePdfs = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== acceptedFiles.length) {
      toast({
        title: "Invalid files",
        description: "Please upload only PDF files",
        variant: "destructive",
      });
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    setMergedPdfUrl(null);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setMergedPdfUrl(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      toast({
        title: "Need more files",
        description: "Please upload at least 2 PDF files to merge",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const fileBytes = await files[i].arrayBuffer();
        const pdf = await PDFDocument.load(fileBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
        setProgress(((i + 1) / files.length) * 100);
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);

      toast({
        title: "Success!",
        description: "PDFs merged successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to merge PDFs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadMergedPdf = () => {
    if (mergedPdfUrl) {
      const a = document.createElement('a');
      a.href = mergedPdfUrl;
      a.download = 'merged.pdf';
      a.click();
    }
  };

  const uploadNew = () => {
    setFiles([]);
    setMergedPdfUrl(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Merge PDFs Online</h1>
            <p className="text-muted-foreground text-lg">
              Combine multiple PDF files into one document for free
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              {!mergedPdfUrl ? (
                <>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2">
                      {isDragActive ? "Drop PDFs here" : "Drag & drop PDF files here"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">or click to select files</p>
                    <Button variant="secondary">Select PDFs</Button>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="font-semibold mb-3">Selected Files ({files.length})</h3>
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {processing && (
                    <div className="mt-6">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Merging PDFs... {Math.round(progress)}%
                      </p>
                    </div>
                  )}

                  {files.length >= 2 && !processing && (
                    <div className="mt-6 text-center">
                      <Button onClick={mergePdfs} size="lg">
                        Merge {files.length} PDFs
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">PDF Merged Successfully!</h3>
                    <p className="text-muted-foreground">Your merged PDF is ready to download</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={downloadMergedPdf} size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download Merged PDF
                    </Button>
                    <Button onClick={uploadNew} variant="outline" size="lg">
                      <Upload className="w-4 h-4 mr-2" />
                      Merge New PDFs
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
                  <AccordionTrigger>Step 1: Upload PDF Files</AccordionTrigger>
                  <AccordionContent>
                    Click the upload area or drag and drop multiple PDF files you want to merge. You can upload as many PDFs as you need.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Step 2: Arrange Order</AccordionTrigger>
                  <AccordionContent>
                    The files will be merged in the order they appear in the list. Remove any files you don't want by clicking the X button.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Step 3: Merge & Download</AccordionTrigger>
                  <AccordionContent>
                    Click "Merge PDFs" to combine all files into one. Once complete, download your merged PDF file.
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
                  <AccordionTrigger>Is it free to merge PDFs?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Our PDF merger is completely free with no limitations on file size or number of files.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Is my data safe?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! All PDF merging happens locally in your browser. Your files never leave your device, ensuring complete privacy.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>How many PDFs can I merge?</AccordionTrigger>
                  <AccordionContent>
                    You can merge as many PDF files as you need. However, very large numbers of files may take longer to process.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>What's the maximum file size?</AccordionTrigger>
                  <AccordionContent>
                    There's no strict limit, but processing very large PDFs may be slower depending on your device's capabilities.
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

export default MergePdfs;
