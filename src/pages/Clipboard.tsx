import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, Copy, Trash2, Clock, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Clipboard = () => {
  const { code: urlCode } = useParams();
  const [uploadType, setUploadType] = useState<"text" | "file">("text");
  const [textContent, setTextContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [accessCode, setAccessCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [clipData, setClipData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();

  // Load clip from URL parameter if present
  useEffect(() => {
    if (urlCode) {
      setAccessCode(urlCode);
      setActiveTab("access");
      handleAccessByCode(urlCode);
    }
  }, [urlCode]);

  const calculateTimeRemaining = (lastAccessed: string) => {
    const lastAccessedTime = new Date(lastAccessed).getTime();
    const expiryTime = lastAccessedTime + 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) return "Expired";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleUpload = async () => {
    if (uploadType === "text" && !textContent.trim()) {
      toast({ title: "Error", description: "Please enter some text", variant: "destructive" });
      return;
    }
    if (uploadType === "file" && selectedFiles.length === 0) {
      toast({ title: "Error", description: "Please select at least one file", variant: "destructive" });
      return;
    }

    // Check total file size (max 10MB)
    if (uploadType === "file") {
      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (totalSize > maxSize) {
        toast({ 
          title: "Error", 
          description: `Total file size exceeds 10MB limit. Current: ${(totalSize / 1024 / 1024).toFixed(2)}MB`, 
          variant: "destructive" 
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (uploadType === "text") {
        const { data, error } = await supabase.functions.invoke("clipboard/upload", {
          body: { text: textContent },
        });

        if (error) throw error;
        setGeneratedCode(data.accessCode);
        setTextContent("");
        toast({ title: "Success", description: "Clip created successfully!" });
      } else {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const { data, error } = await supabase.functions.invoke("clipboard/upload", {
          body: formData,
        });

        if (error) throw error;
        setGeneratedCode(data.accessCode);
        setSelectedFiles([]);
        toast({ title: "Success", description: `${selectedFiles.length} file(s) uploaded successfully!` });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error", description: "Failed to create clip", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAccessByCode = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clipboard/access/${code.trim()}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        toast({ title: "Not Found", description: "This clip has expired or doesn't exist.", variant: "destructive" });
        setClipData(null);
        return;
      }

      const data = await response.json();
      setClipData(data);
      setTimeRemaining(calculateTimeRemaining(data.lastAccessed));

      const interval = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining(data.lastAccessed));
      }, 1000);

      setTimeout(() => clearInterval(interval), 60 * 60 * 1000);
    } catch (error) {
      console.error("Access error:", error);
      toast({ title: "Error", description: "Failed to access clip", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleAccess = async () => {
    if (!accessCode.trim()) {
      toast({ title: "Error", description: "Please enter an access code", variant: "destructive" });
      return;
    }
    handleAccessByCode(accessCode.trim());
  };

  const handleDelete = async () => {
    if (!accessCode.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clipboard/delete/${accessCode.trim()}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete');

      toast({ title: "Success", description: "Clip deleted successfully" });
      setClipData(null);
      setAccessCode("");
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete clip", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const copyShareLink = (code: string) => {
    const link = `https://oneklick.app/clipboard/${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Share link copied to clipboard" });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadType("file");
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Helmet>
        <title>Online Clipboard - Share Text & Files Securely</title>
        <meta name="description" content="Share text or files securely with auto-expiring access codes. Upload and share any file type with a unique code." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Online Clipboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Share text or files securely. All clips expire 1 hour after last access.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload / Create Clip</TabsTrigger>
                <TabsTrigger value="access">Access Clip</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "text" | "file")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="file">File</TabsTrigger>
                      </TabsList>

                      <TabsContent value="text" className="mt-4">
                        <Textarea
                          placeholder="Paste or type your text here..."
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </TabsContent>

                      <TabsContent value="file" className="mt-4">
                        <div 
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            isDragging ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Drag and drop files here, or click to select (Max 10MB total)
                          </p>
                          <Input
                            type="file"
                            multiple
                            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                            className="mb-4"
                          />
                          {selectedFiles.length > 0 && (
                            <div className="space-y-2 mt-4">
                              <p className="text-sm font-medium text-left">
                                Selected files ({selectedFiles.length}):
                              </p>
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-left">
                                  <span className="text-sm truncate flex-1">
                                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeFile(index)}
                                    className="ml-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <p className="text-xs text-muted-foreground text-left">
                                Total: {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB / 10 MB
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Button onClick={handleUpload} disabled={loading} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      {loading ? "Uploading..." : "Create Clip"}
                    </Button>

                    {generatedCode && (
                      <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Your access code:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-2xl font-bold text-primary">{generatedCode}</code>
                            <Button onClick={() => copyToClipboard(generatedCode)} variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Shareable link:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm text-primary truncate">
                              https://oneklick.app/clipboard/{generatedCode}
                            </code>
                            <Button onClick={() => copyShareLink(generatedCode)} variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This clip will expire 1 hour after the last access
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="access" className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter access code..."
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                        className="flex-1"
                      />
                      <Button onClick={handleAccess} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" />
                        Access
                      </Button>
                    </div>

                    {clipData && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Expires in: {timeRemaining}</span>
                          </div>
                          <Button onClick={handleDelete} variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {clipData.type === "text" ? (
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Text Content</span>
                              <Button onClick={() => copyToClipboard(clipData.content)} variant="outline" size="sm">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm">{clipData.content}</pre>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Files ({clipData.files?.length || 1})</p>
                              <p className="text-xs text-muted-foreground">
                                Total: {(clipData.totalSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            {clipData.files?.map((file: any, index: number) => (
                              <div key={index} className="p-3 bg-background rounded border">
                                <p className="text-sm font-medium mb-1">{file.fileName}</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Size: {(file.fileSize / 1024).toFixed(2)} KB
                                </p>
                                <Button asChild size="sm" className="w-full">
                                  <a href={file.downloadUrl} download={file.fileName}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Informational Sections */}
            <div className="mt-16 space-y-12">
              {/* How to Use */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">How to Use</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Creating a Clip</h3>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-2">
                      <li>Enter your content: Type or paste the text, image, or file you want to share into the clipboard box</li>
                      <li>Generate a code or link: The system creates a unique URL or short access code for your clipboard</li>
                      <li>Access anywhere: Open the link or enter the code on another device to retrieve your data instantly</li>
                      <li>Auto-delete or save: Depending on the settings, the clipboard can destroy the data after it's viewed or keep it for a set period (usually up to 24 hours or one month)</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* FAQ */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">FAQ</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">What is an online clipboard?</h3>
                    <p className="text-muted-foreground">
                      An online clipboard is a cloud-based tool that allows users to copy, paste, and share data instantly between multiple devices. 
                      Unlike the traditional clipboard built into your computer or smartphone — which only stores copied content temporarily on one device — 
                      an online clipboard lets you move text, images, or even files seamlessly across the internet.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Why use an online clipboard?</h3>
                    <p className="text-muted-foreground">
                      In today's world, people often switch between laptops, tablets, and phones while working. Sending small snippets of information between 
                      these devices can be frustrating and time-consuming. Online clipboard tools solve this problem by acting as a temporary, sharable workspace. 
                      You can copy something on one device and instantly access it on another using a unique link or code.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Is it safe to use?</h3>
                    <p className="text-muted-foreground">
                      Online clipboards are designed for temporary and quick sharing, not long-term secure storage. Each clipboard has a unique access ID or URL, 
                      making it unlikely for someone to guess it. However, users should avoid sharing sensitive or confidential data since public clipboards 
                      may be visible to anyone with the access link. For private data, consider using password protection features when available.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Do I need to create an account?</h3>
                    <p className="text-muted-foreground">
                      No registration required! Start sharing immediately without signing up or installing anything. The service works on any modern browser 
                      across Windows, macOS, Linux, Android, and iOS.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">How long do clips last?</h3>
                    <p className="text-muted-foreground">
                      Clips expire after 1 hour of inactivity to maintain your privacy. The timer resets each time someone accesses the clip. 
                      You can also manually delete clips at any time for added security.
                    </p>
                  </div>
                </div>
              </section>

              {/* About */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">About Online Clipboard</h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">What Is an Online Clipboard?</h3>
                    <p>
                      An online clipboard is a cloud-based tool that allows users to copy, paste, and share data instantly between multiple devices. 
                      Unlike the traditional clipboard built into your computer or smartphone — which only stores copied content temporarily on one device — 
                      an online clipboard lets you move text, images, or even files seamlessly across the internet.
                    </p>
                    <p className="mt-2">
                      Whether you're transferring a short note, a link, or a small image, online clipboard services make it fast, simple, and secure — 
                      no email, USB drive, or chat app required.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Key Features</h3>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      <li><strong>Instant sharing:</strong> Copy and paste between devices in seconds</li>
                      <li><strong>Shareable link / code access:</strong> Scan and open your clipboard on any mobile device</li>
                      <li><strong>Auto-expiration:</strong> Your data can self-destruct after being viewed to maintain privacy</li>
                      <li><strong>No registration required:</strong> Start sharing immediately without signing up or installing anything</li>
                      <li><strong>Cross-platform compatibility:</strong> Works on any modern browser across Windows, macOS, Linux, Android, and iOS</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Future of Online Clipboards</h3>
                    <p>
                      As digital workflows continue to evolve, online clipboard tools are becoming smarter and more feature-rich. Future updates may include 
                      multi-format data support (such as styled text, HTML, or spreadsheets), real-time synchronization, and integration with cloud storage platforms.
                    </p>
                    <p className="mt-2">
                      With growing demand for fast, device-independent data sharing, the online clipboard is shaping up to be an essential productivity tool 
                      for modern users.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="font-medium text-foreground">
                      In short: Online clipboards take the classic copy-paste function to the next level — bringing flexibility, speed, and convenience to the cloud. 
                      Whether you're a student, developer, or everyday multitasker, it's the simplest way to copy once and paste anywhere.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Clipboard;
