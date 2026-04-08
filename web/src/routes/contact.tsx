import { createFileRoute } from "@tanstack/react-router";
import LandingFooter from "@/components/landing/LandingFooter";
import Navbar from "@/components/landing/Navbar";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col justify-end">
        {/* We use LandingFooter as an actual page block since it covers our contact/legal details */}
        <div className="py-24 max-w-2xl mx-auto px-6 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-body font-semibold tracking-widest uppercase mb-4">
            Get in Touch
          </span>
          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
            We'd love to hear from you.
          </h1>
          <p className="font-body text-base text-muted-foreground">
            Whether you want to partner with us, ask a question about our
            safehouses, or learn more about how your donations are used, our
            team is ready to connect.
          </p>
        </div>
        <LandingFooter />
      </main>
    </div>
  );
}
