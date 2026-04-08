import { Pricing } from "@/components/landing/pricing";
import { CTA } from "@/components/landing/cta";

export const metadata = {
  title: "Pricing — Fintrest.ai",
  description:
    "Simple, transparent pricing. Start free and upgrade when you need more signals and earlier alerts.",
};

export default function PricingPage() {
  return (
    <>
      <Pricing />
      <CTA />
    </>
  );
}
