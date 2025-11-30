import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clipboard, Image, FileText } from "lucide-react";
import { trackOutboundLink } from "@/lib/analytics";

const tools = [
  {
    icon: Clipboard,
    title: "Clipboard Manager",
    description: "Advanced clipboard with history and quick access",
    href: "/clipboard",
    available: true,
  },
  {
    icon: Image,
    title: "PNG to JPEG",
    description: "Convert PNG images to JPEG format",
    href: "/png-to-jpeg",
    available: true,
  },
  {
    icon: Image,
    title: "JPEG to PNG",
    description: "Convert JPEG images to PNG format",
    href: "/jpeg-to-png",
    available: true,
  },
  {
    icon: Image,
    title: "Image Compressor",
    description: "Compress and optimize images",
    href: "/image-compressor",
    available: true,
  },
  {
    icon: Image,
    title: "Image Cropper",
    description: "Crop and resize images easily",
    href: "/image-cropper",
    available: true,
  },
  {
    icon: Image,
    title: "Background Remover",
    description: "Remove backgrounds from images",
    href: "/background-remover",
    available: true,
  },
  {
    icon: Image,
    title: "Image Resizer",
    description: "Resize images to any dimension",
    href: "/image-resizer",
    available: true,
  },
  {
    icon: Image,
    title: "Image to WebP",
    description: "Convert images to WebP format",
    href: "/image-to-webp",
    available: true,
  },
  {
    icon: Image,
    title: "Image to BMP",
    description: "Convert images to BMP format",
    href: "/image-to-bmp",
    available: true,
  },
  {
    icon: FileText,
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one",
    href: "/merge-pdfs",
    available: true,
  },
  {
    icon: FileText,
    title: "Split PDF",
    description: "Extract pages from PDF",
    href: "/split-pdf",
    available: true,
  },
  {
    icon: FileText,
    title: "Compress PDF",
    description: "Reduce PDF file size",
    href: "/compress-pdf",
    available: true,
  },
  {
    icon: FileText,
    title: "HTML to PDF",
    description: "Convert HTML to PDF",
    href: "/html-to-pdf",
    available: true,
  },
  {
    icon: FileText,
    title: "Image to PDF",
    description: "Convert images to PDF",
    href: "/image-to-pdf",
    available: true,
  },
  {
    icon: FileText,
    title: "PDF to Image",
    description: "Extract PDF pages as images",
    href: "/pdf-to-image",
    available: true,
  },
  {
    icon: FileText,
    title: "PDF Editor",
    description: "Edit text, annotate, and modify PDFs online",
    href: "/pdf-editor",
    available: true,
  },
];

const ToolsShowcase = () => {
  const handleToolClick = (toolTitle: string, href: string) => {
    trackOutboundLink(href, `Tool Card - ${toolTitle}`);
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Tools at Your Fingertips
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to boost your productivity, all in one place
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const CardWrapper = tool.available ? "a" : "div";
            
            return (
              <CardWrapper
                key={tool.title}
                href={tool.available ? tool.href : undefined}
                onClick={tool.available ? () => handleToolClick(tool.title, tool.href) : undefined}
                className="block"
              >
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 bg-card cursor-pointer relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {tool.title}
                      {!tool.available && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ToolsShowcase;
