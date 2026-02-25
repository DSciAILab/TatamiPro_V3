import { Check, Zap, Shield, Headphones } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast Delivery",
    description: "Agile methodologies that guarantee results in record time.",
  },
  {
    icon: Shield,
    title: "Total Security",
    description: "Your data protected with the best security practices.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Specialized team available to help when you need it.",
  },
];

const benefits = [
  "Custom solutions for your business",
  "Integration with existing systems",
  "Guaranteed scalability",
  "Clean and documented code",
  "Team training included",
  "Continuous maintenance and updates",
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-secondary/30 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-primary text-sm font-medium uppercase tracking-wider">
              Why choose us
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
              Cutting-edge technology for{" "}
              <span className="gradient-text">real results</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Our team combines technical expertise with business vision to deliver 
              solutions that really make a difference in your day-to-day.
            </p>

            {/* Benefits List */}
            <div className="grid sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
