import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";

import logoImg from "@/assets/logo.png";

export default function LandingFooter() {
  return (
    <footer id="contact" className="bg-primary text-white/90">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoImg} alt="Keeper" className="h-8 w-8 rounded-lg" />
              <span className="font-heading text-lg font-semibold text-white">
                Keeper
              </span>
            </div>
            <p className="font-body text-sm leading-relaxed text-white/60">
              Providing safe shelter and healing for survivors of abuse and
              trafficking in the Philippines.
            </p>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Contact
            </h4>
            <div className="space-y-3">
              <a
                href="mailto:info@keeper.org"
                className="flex items-center gap-2 text-sm hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 text-yellow-500" /> info@keeper.org
              </a>
              <a
                href="tel:+15551234567"
                className="flex items-center gap-2 text-sm hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4 text-yellow-500" /> +1 (555) 123-4567
              </a>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-yellow-500" /> Provo, UT 84064
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <div className="space-y-3">
              <Link
                to="/privacy-policy"
                className="block text-sm hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <a
                href="#"
                className="block text-sm hover:text-white transition-colors"
              >
                Cookie Consent
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-xs text-white/40">
            © {new Date().getFullYear()} Keeper. All rights reserved. 501(c)(3)
            Tax-Exempt Organization.
          </p>
          <div className="flex items-center gap-4">
            <button className="font-body text-xs text-white/40 hover:text-white/60 transition-colors">
              Cookie Preferences
            </button>
            <span className="text-white/20">|</span>
            <span className="font-body text-xs text-white/40">
              EIN: 12-3456789
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
