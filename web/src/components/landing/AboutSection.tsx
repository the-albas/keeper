import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { GraduationCap, Handshake, Heart, Shield } from "lucide-react";

import logoImg from "@/assets/logo.png";

interface Pillar {
	icon: LucideIcon;
	title: string;
	desc: string;
}

const pillars: Pillar[] = [
	{
		icon: Shield,
		title: "Safe Shelter",
		desc: "24/7 protected housing with trained staff",
	},
	{
		icon: Heart,
		title: "Trauma Recovery",
		desc: "Professional counseling and therapeutic care",
	},
	{
		icon: GraduationCap,
		title: "Education",
		desc: "Academic and vocational training programs",
	},
	{
		icon: Handshake,
		title: "Reintegration",
		desc: "Family reunification and community support",
	},
];

export default function AboutSection() {
	return (
		<section id="about" className="py-24 bg-secondary/50">
			<div className="max-w-7xl mx-auto px-6">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					<motion.div
						initial={{ opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-body font-semibold tracking-widest uppercase mb-4">
							How We Work
						</span>
						<h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
							Partnering Locally for{" "}
							<span className="text-yellow-600">Lasting Change</span>
						</h2>
						<p className="font-body text-base text-muted-foreground leading-relaxed mb-4">
							As a US-based 501(c)(3) nonprofit, we contract with vetted
							in-country partner organizations across the Philippines to operate
							safehouses and deliver comprehensive rehabilitation services.
						</p>
						<p className="font-body text-base text-muted-foreground leading-relaxed mb-8">
							Our model ensures culturally sensitive care while maintaining the
							highest standards of accountability. Every dollar donated goes
							directly to providing shelter, education, counseling, and a path
							forward for each girl in our care.
						</p>
						<br />
						<div className="grid grid-cols-2 gap-4">
							{pillars.map((p) => (
								<div
									key={p.title}
									className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
								>
									<div className="flex-shrink-0 w-9 h-9 rounded-lg bg-yellow-500/20 text-yellow-600 flex items-center justify-center">
										<p.icon className="h-4 w-4" />
									</div>
									<div>
										<div className="font-body text-sm font-semibold text-foreground">
											{p.title}
										</div>
										<div className="font-body text-xs text-muted-foreground">
											{p.desc}
										</div>
									</div>
								</div>
							))}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 30 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="relative"
					>
						<img
							src={logoImg}
							alt="Keeper logo"
							className="w-full object-contain mix-blend-multiply"
						/>
						<div className="absolute bottom-20 left-8 bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl">
							<div className="font-heading text-3xl font-bold">100%</div>
							<div className="font-body text-sm opacity-90">
								Donation Funded
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
