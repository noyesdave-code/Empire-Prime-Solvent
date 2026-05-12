import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-background border-b border-primary px-4 py-2 text-center text-xs text-white">
      All payments in the preview are test mode.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium text-white"
      >
        Learn more
      </a>
    </div>
  );
}
