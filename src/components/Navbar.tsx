import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackOutboundLink } from "@/lib/analytics";

const Navbar = () => {
  const handleClipboardClick = () => {
    trackOutboundLink('/clipboard', 'Navbar Clipboard Link');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow" />
          <span className="text-xl font-bold">oneklick.app</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <a 
            href="/clipboard" 
            onClick={handleClipboardClick}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clipboard Tool
          </a>
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
