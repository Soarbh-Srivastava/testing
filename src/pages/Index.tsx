import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ToolsShowcase from "@/components/ToolsShowcase";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ToolsShowcase />
      <Footer />
    </div>
  );
};

export default Index;
