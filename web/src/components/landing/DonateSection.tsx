import { Button } from "@/components/ui/button";
import { apiPostJson, getApiBaseUrl } from "@/lib/api";
import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const amounts = [5, 10, 25, 50, 100, 250, 500];

function formatAmount(value: number) {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export default function DonateSection() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<
    number | "custom" | null
  >(50);
  const [customAmount, setCustomAmount] = useState("");
  const [customTouched, setCustomTouched] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

	const parsedCustom = parseFloat(customAmount);
	const resolvedAmount =
		selectedAmount === "custom" ? parsedCustom : selectedAmount;
	const customValid = !isNaN(parsedCustom) && parsedCustom > 0;
	const showCustomError =
		selectedAmount === "custom" && customTouched && !customValid;

  function handleDonate() {
    if (selectedAmount === "custom") {
      setCustomTouched(true);
      if (!customValid) return;
    }
    if (!resolvedAmount || resolvedAmount <= 0) return;
    setSubmitError(null);
    setShowConfirm(true);
  }

  async function confirmDonate() {
    if (!resolvedAmount || resolvedAmount <= 0) return;
    if (!getApiBaseUrl()) {
      setSubmitError("Donations are temporarily unavailable (API not configured).");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiPostJson<{ donationId: number }>("/api/public/donations", {
        amount: resolvedAmount,
      });
      setShowConfirm(false);
      navigate({
        to: "/donate-thank-you",
        search: { amount: resolvedAmount },
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not complete donation.");
    } finally {
      setSubmitting(false);
    }
  }

	return (
		<section id="donate" className="bg-background py-24">
			<div className="mx-auto max-w-3xl px-6 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<span className="mb-4 inline-block rounded-full bg-yellow-500/20 px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-widest text-yellow-600">
						Make a Difference
					</span>
					<h2 className="font-heading mx-auto mb-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
						Your Generous Donations Create Safe Destinations.
					</h2>
					<p className="font-body mb-10 px-4 text-balance text-base leading-relaxed text-muted-foreground">
						We depend entirely on donations to operate. Every contribution
						directly funds shelter, food, counseling, education, and a new
						beginning for a survivor.
					</p>
					<br />

					<div className="mb-8 flex flex-wrap justify-center gap-3">
						{amounts.map((amt) => (
							<button
								type="button"
								key={amt}
								onClick={() => setSelectedAmount(amt)}
								className={`rounded-xl border-2 px-6 py-3 font-body font-semibold transition-all duration-200 ${
									selectedAmount === amt
										? "border-yellow-500 bg-yellow-500 text-black shadow-sm"
										: "border-border text-primary hover:border-yellow-500/50 hover:bg-yellow-500/5"
								}`}
							>
								${amt}
							</button>
						))}
						<button
							type="button"
							onClick={() => setSelectedAmount("custom")}
							className={`rounded-xl border-2 px-6 py-3 font-body text-base font-semibold transition-all duration-200 ${
								selectedAmount === "custom"
									? "border-yellow-500 bg-yellow-500/10 text-yellow-600 shadow-sm"
									: "border-border text-primary hover:border-yellow-500/50 hover:bg-yellow-500/5"
							}`}
						>
							Custom
						</button>
					</div>

					{selectedAmount === "custom" && (
						<div className="mb-8 flex flex-col items-center gap-2">
							<div className="relative w-48">
								<span className="absolute left-4 top-1/2 -translate-y-1/2 font-body font-semibold text-muted-foreground">
									$
								</span>
								<input
									type="number"
									min="0.01"
									step="0.01"
									placeholder="0.00"
									required
									value={customAmount}
									onChange={(e) => {
										setCustomAmount(e.target.value);
										setCustomTouched(true);
									}}
									onBlur={() => setCustomTouched(true)}
									className={`w-full rounded-xl border-2 bg-background py-3 pl-8 pr-4 text-center font-body text-lg font-semibold text-foreground outline-none transition-all focus:border-yellow-500 ${
										showCustomError ? "border-red-400" : "border-border"
									}`}
								/>
							</div>
							{showCustomError && (
								<p className="font-body text-xs text-red-500">
									Please enter an amount greater than $0.
								</p>
							)}
						</div>
					)}

					<Button
						size="lg"
						onClick={handleDonate}
						disabled={!resolvedAmount || resolvedAmount <= 0}
						className="h-14 gap-2 rounded-xl bg-yellow-500 px-12 font-body text-lg text-black shadow-lg hover:bg-yellow-600 disabled:opacity-50"
					>
						<Heart className="h-5 w-5" />
						Donate Now
					</Button>
					<br />
					<br />
					<p className="font-body mt-6 text-xs text-primary">
						Keeper is a registered 501(c)(3) nonprofit. All donations are
						tax-deductible. EIN: 12-3456789
					</p>
				</motion.div>
			</div>

      <AnimatePresence>
        {showConfirm && resolvedAmount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => { if (!submitting) setShowConfirm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-background p-8 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/20">
                <Heart className="h-7 w-7 text-yellow-600 fill-yellow-500" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Confirm Your Donation
              </h3>
              <p className="font-body text-sm text-muted-foreground mt-3">
                You are about to donate{" "}
                <span className="font-semibold text-yellow-600 text-base">
                  ${formatAmount(resolvedAmount)}
                </span>
                . Would you like to proceed?
              </p>
              {submitError && (
                <p className="font-body text-xs text-red-500 mt-3 text-left">
                  {submitError}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 font-body rounded-xl h-11"
                  disabled={submitting}
                  onClick={() => {
                    setSubmitError(null);
                    setShowConfirm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-body gap-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl h-11"
                  disabled={submitting}
                  onClick={() => void confirmDonate()}
                >
                  <Heart className="h-4 w-4" />
                  {submitting ? "Saving…" : "Donate"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
