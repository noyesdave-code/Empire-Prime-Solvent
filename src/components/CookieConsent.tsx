import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "empire_cookie_consent_v1";

/** Minimal GDPR/ePrivacy consent gate. We don't run any non-essential
 *  trackers until the user accepts. Honors GPC. */
export const CookieConsent = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // Honor Global Privacy Control automatically.
      const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
      if (gpc) {
        localStorage.setItem(KEY, "rejected");
        return;
      }
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch { /* private mode — show banner */ setOpen(true); }
  }, []);

  if (!open) return null;
  const set = (v: "accepted" | "rejected") => {
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-3 left-3 right-3 z-[120] mx-auto max-w-2xl rounded-xl border border-white/15 bg-black/90 p-4 text-white shadow-2xl backdrop-blur-md sm:bottom-4"
    >
      <p className="text-xs sm:text-sm text-white/85">
        We use only essential cookies to run the site and process payments. With
        your consent, we may also store anonymous analytics to improve the
        product. See our{" "}
        <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" className="text-white/80 hover:text-white" onClick={() => set("rejected")}>
          Reject non-essential
        </Button>
        <Button size="sm" className="bg-red-700 hover:bg-red-600 text-white" onClick={() => set("accepted")}>
          Accept all
        </Button>
      </div>
    </div>
  );
};
