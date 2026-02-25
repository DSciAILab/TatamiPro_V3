import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

const CTA = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to{" "}
            <span className="gradient-text">transform</span>{" "}
            your business?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Get in touch and discover how H.AI.ndled's AI and automation solutions 
            can boost your results. Let's build the future together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Schedule a call
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="hero-outline" size="xl">
              <Mail className="w-5 h-5" />
              hello@haindled.com
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
