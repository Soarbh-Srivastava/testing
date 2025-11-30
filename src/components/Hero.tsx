import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 rounded-full bg-secondary border border-border text-sm">
            ✨ Productivity tools made simple
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            One Click,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Endless Possibilities
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access powerful tools instantly. No sign-up, no hassle. Just simple, effective utilities that get the job done.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/clipboard" reloadDocument>
              <Button size="lg" className="bg-primary hover:bg-primary/90 group">
                Try Clipboard Tool
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Button size="lg" variant="outline">
              View All Tools
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
