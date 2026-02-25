import { Github, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div>
            <span className="text-2xl font-bold gradient-text">H.AI.ndled</span>
            <p className="text-sm text-muted-foreground mt-2">
              Intelligent solutions for innovative businesses.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Services
            </a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Linkedin className="w-5 h-5 text-muted-foreground" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Twitter className="w-5 h-5 text-muted-foreground" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Github className="w-5 h-5 text-muted-foreground" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 H.AI.ndled. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
