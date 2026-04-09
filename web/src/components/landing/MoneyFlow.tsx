import { motion } from "framer-motion";
import { useMoneyFlowMetric } from "@/components/landing/useImpactMetrics";

type MoneyFlowData = {
	programsPct: number;
	operationsPct: number;
	administrationPct: number;
};

const fallbackMoneyFlow: MoneyFlowData = {
	programsPct: 85,
	operationsPct: 10,
	administrationPct: 5,
};

export default function MoneyFlow() {
	const moneyFlowMetric = useMoneyFlowMetric();
	const moneyFlow = moneyFlowMetric.data ?? fallbackMoneyFlow;
	const programsLabel = `${moneyFlow.programsPct}% Programs & Services`;
	const operationsLabel = `${moneyFlow.operationsPct}% Operations`;
	const administrationLabel = `${moneyFlow.administrationPct}% Administration`;

	return (
		<section className="bg-white py-24">
			<div className="mx-auto max-w-3xl px-6 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="font-heading mb-8 text-2xl font-bold text-foreground md:text-3xl">
						Where Your Money Goes
					</h2>
					{moneyFlowMetric.isLoading ? (
						<p className="font-body mb-4 text-sm text-muted-foreground">
							Loading latest allocation mix...
						</p>
					) : null}
					{moneyFlowMetric.isError ? (
						<p className="font-body mb-4 text-sm text-muted-foreground">
							Showing fallback allocation while live data is unavailable.
						</p>
					) : null}

					{/* Horizontal Stacked Bar */}
					<div
						className="mb-6 flex h-4 w-full overflow-hidden rounded-full shadow-inner md:h-6"
						role="img"
						aria-label={`Donation allocation: ${programsLabel}, ${operationsLabel}, ${administrationLabel}`}
					>
						<motion.div
							initial={{ width: 0 }}
							whileInView={{ width: `${moneyFlow.programsPct}%` }}
							transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
							className="h-full bg-primary"
							aria-hidden="true"
						/>
						<motion.div
							initial={{ width: 0 }}
							whileInView={{ width: `${moneyFlow.operationsPct}%` }}
							transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
							className="h-full bg-yellow-500"
							aria-hidden="true"
						/>
						<motion.div
							initial={{ width: 0 }}
							whileInView={{ width: `${moneyFlow.administrationPct}%` }}
							transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
							className="h-full bg-muted-foreground/30"
							aria-hidden="true"
						/>
					</div>

					<div className="mb-10 flex flex-wrap justify-center gap-6">
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded-full bg-primary" />
							<span className="font-body text-sm font-medium text-foreground">
								{programsLabel}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded-full bg-yellow-500" />
							<span className="font-body text-sm font-medium text-foreground">
								{operationsLabel}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
							<span className="font-body text-sm font-medium text-foreground">
								{administrationLabel}
							</span>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
