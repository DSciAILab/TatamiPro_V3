import { Bot, Code, Cpu, Workflow } from "lucide-react";

const services = [
  {
    icon: Bot,
    title: "AI Solutions",
    description: "Intelligent chatbots, predictive analytics and custom machine learning to optimize your processes.",
  },
  {
    icon: Code,
    title: "Software Development",
    description: "Custom web and mobile applications built with the most modern technologies on the market.",
  },
  {
    icon: Workflow,
    title: "Process Automation",
    description: "Automate repetitive tasks and integrate systems to increase operational efficiency.",
  },
  {
    icon: Cpu,
    title: "Tech Consulting",
    description: "Strategic analysis and implementation of technology solutions aligned with your business goals.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Our Services
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4">
            What we can do for you
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We offer complete technology solutions to transform the way your company operates and competes in the market.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="group relative gradient-border p-6 hover:scale-105 transition-transform duration-300"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
