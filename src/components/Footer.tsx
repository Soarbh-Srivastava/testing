import { Link } from "react-router-dom";

const Footer = () => {
  const tools = [
    { name: "Clipboard", path: "/clipboard" },
    { name: "PNG to JPEG", path: "/png-to-jpeg" },
    { name: "JPEG to PNG", path: "/jpeg-to-png" },
    { name: "Image Compressor", path: "/image-compressor" },
    { name: "Image Cropper", path: "/image-cropper" },
    { name: "Background Remover", path: "/background-remover" },
    { name: "Image Resizer", path: "/image-resizer" },
    { name: "Image to WebP", path: "/image-to-webp" },
    { name: "Image to BMP", path: "/image-to-bmp" },
    { name: "Merge PDFs", path: "/merge-pdfs" },
    { name: "Split PDF", path: "/split-pdf" },
    { name: "Compress PDF", path: "/compress-pdf" },
    { name: "HTML to PDF", path: "/html-to-pdf" },
    { name: "Image to PDF", path: "/image-to-pdf" },
    { name: "PDF to Image", path: "/pdf-to-image" },
  ];

  return (
    <footer className="border-t bg-muted/50 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-semibold mb-4">Image Tools</h3>
            <ul className="space-y-2">
              {tools.slice(1, 9).map((tool) => (
                <li key={tool.path}>
                  <Link
                    to={tool.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">PDF Tools</h3>
            <ul className="space-y-2">
              {tools.slice(9, 15).map((tool) => (
                <li key={tool.path}>
                  <Link
                    to={tool.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Other Tools</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/clipboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clipboard
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/blog"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Articles
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} OneKlick. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
