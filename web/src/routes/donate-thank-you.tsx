import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/landing/Navbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

type DonateSearch = { amount?: number };

export const Route = createFileRoute("/donate-thank-you")({
  validateSearch: (search: Record<string, unknown>): DonateSearch => ({
    amount: Number(search.amount) || undefined,
  }),
  component: DonateThankYouPage,
});

function formatAmount(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DonateThankYouPage() {
  const { amount } = Route.useSearch();

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20">
            <Heart className="h-8 w-8 text-yellow-600 fill-yellow-500" />
          </div>

          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-6">
            Thank You!
          </h1>

          {amount ? (
            <p className="font-body text-base text-muted-foreground leading-relaxed mt-4">
              Your generous donation of{" "}
              <span className="font-semibold text-yellow-600 text-xl">
                ${formatAmount(amount)}
              </span>{" "}
              will make a real difference.
            </p>
          ) : (
            <p className="font-body text-base text-muted-foreground leading-relaxed mt-4">
              Your generous donation will make a real difference.
            </p>
          )}

          <p className="font-body text-sm text-muted-foreground leading-relaxed mt-4">
            Every dollar helps provide shelter, food, counseling, and a fresh
            start for survivors. You are part of something meaningful.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link to="/">
              <Button
                variant="outline"
                className="font-body gap-2 rounded-xl px-6 h-11"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/" hash="donate">
              <Button className="font-body gap-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl px-6 h-11">
                <Heart className="h-4 w-4" />
                Donate Again
              </Button>
            </Link>
          </div>

        </motion.div>
      </main>
      <p className="font-body text-xs text-muted-foreground text-center pb-8">
        Keeper is a registered 501(c)(3) nonprofit. All donations are
        tax-deductible. EIN: 12-3456789
      </p>
      <LandingFooter />
    </div>
  );
}
