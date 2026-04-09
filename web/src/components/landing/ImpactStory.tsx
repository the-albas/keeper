import { motion } from "framer-motion";

export default function ImpactStory() {
	return (
		<section className="py-24 bg-[#FDFBF7]">
			<div className="max-w-4xl mx-auto px-6 text-center">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="space-y-8"
				>
					<div className="text-accent/40 mb-6 text-6xl font-heading leading-none">
						"
					</div>
					<blockquote className="font-heading text-3xl md:text-5xl font-semibold text-foreground leading-snug">
						When she arrived, she couldn't read. Today, she's enrolled in
						secondary school and dreams of becoming a teacher.
					</blockquote>
					<cite className="block font-body text-base font-medium text-muted-foreground uppercase tracking-widest mt-8 not-italic">
						— A resident's journey
					</cite>
				</motion.div>
			</div>
		</section>
	);
}
