import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SiteHeaderMark, LegalFooter } from "@/components/SiteChrome";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index.tsx";
import Boardroom from "./pages/Boardroom.tsx";

// Lazy-load non-landing routes to shrink the initial JS bundle.
// Landing (Index) stays eager so first paint and LCP are unchanged.
// Boardroom stays eager — owner uses it constantly and lazy chunk fetches were failing.
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const UnicornBoxManual = lazy(() => import("./pages/UnicornBoxManual.tsx"));
const UnicornBoxIntake = lazy(() => import("./pages/UnicornBoxIntake.tsx"));
const UnicornBoxLanding = lazy(() => import("./pages/UnicornBoxLanding.tsx"));
const UnicornBoxBlueprint = lazy(() => import("./pages/UnicornBoxBlueprint.tsx"));
const Emerald = lazy(() => import("./pages/Emerald.tsx"));
const Marble = lazy(() => import("./pages/Marble.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Refund = lazy(() => import("./pages/Refund.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const AskUnicornHealth = lazy(() => import("./pages/AskUnicornHealth.tsx"));
const EmpirePage = lazy(() => import("./pages/EmpirePage.tsx"));
const EmpireAsset = lazy(() => import("./pages/EmpireAsset.tsx"));
const BrandMarks = lazy(() => import("./pages/BrandMarks.tsx"));
const Funnel = lazy(() => import("./pages/Funnel.tsx"));
const FunnelAnalytics = lazy(() => import("./pages/FunnelAnalytics.tsx"));
const ProductCheckout = lazy(() => import("./pages/ProductCheckout.tsx"));
const Waitlist = lazy(() => import("./pages/Waitlist.tsx"));
const PyronReserved = lazy(() => import("./pages/PyronReserved.tsx"));
const BoardroomSwarms = lazy(() => import("./pages/BoardroomSwarms.tsx"));
const BoardroomSourcing = lazy(() => import("./pages/BoardroomSourcing.tsx"));
const BoardroomResearch = lazy(() => import("./pages/BoardroomResearch.tsx"));
const Answers = lazy(() => import("./pages/Answers.tsx"));
const AnswerDetail = lazy(() => import("./pages/AnswerDetail.tsx"));
const BoardroomAnswers = lazy(() => import("./pages/BoardroomAnswers.tsx"));
const BoardroomSecurity = lazy(() => import("./pages/BoardroomSecurity.tsx"));
const BoardroomLegal = lazy(() => import("./pages/BoardroomLegal.tsx"));
const Empire = lazy(() => import("./pages/Empire.tsx"));
const IDEHome = lazy(() => import("./pages/IDEHome.tsx"));
const IDE = lazy(() => import("./pages/IDE.tsx"));
const ChameleonHub = lazy(() => import("./pages/ChameleonHub.tsx"));
const SolarHarvest = lazy(() => import("./pages/SolarHarvest.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const AniProvider = lazy(() => import("./pages/AniProvider.tsx"));
const AniLedger = lazy(() => import("./pages/AniLedger.tsx"));
const EmpirePRPatch = lazy(() => import("./pages/EmpirePRPatch.tsx"));
const AniBuilder = lazy(() => import("./pages/AniBuilder.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBasename}>
        <PaymentTestModeBanner />
        <SiteHeaderMark />
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Index />} />
            <Route path="/emerald" element={<Emerald />} />
            <Route path="/marble" element={<Marble />} />
            <Route path="/unicorn-box" element={<UnicornBoxLanding />} />
            <Route path="/unicorn-box/start" element={<UnicornBoxIntake />} />
            <Route path="/unicorn-box/blueprint" element={<UnicornBoxBlueprint />} />
            <Route path="/unicorn-box/manual" element={<UnicornBoxManual />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/boardroom" element={<Boardroom />} />
            <Route path="/boardroom/health" element={<AskUnicornHealth />} />
            <Route path="/boardroom/empire/page/:slug" element={<EmpirePage />} />
            <Route path="/boardroom/empire/asset/:slug" element={<EmpireAsset />} />
            <Route path="/brand-marks" element={<BrandMarks />} />
            <Route path="/funnel" element={<Funnel />} />
            <Route path="/boardroom/funnel-analytics" element={<FunnelAnalytics />} />
            <Route path="/boardroom/swarms" element={<BoardroomSwarms />} />
            <Route path="/boardroom/sourcing" element={<BoardroomSourcing />} />
            <Route path="/boardroom/research" element={<BoardroomResearch />} />
            <Route path="/boardroom/answers" element={<BoardroomAnswers />} />
            <Route path="/boardroom/security" element={<BoardroomSecurity />} />
            <Route path="/boardroom/legal" element={<BoardroomLegal />} />
            <Route path="/empire" element={<Empire />} />
            <Route path="/answers" element={<Answers />} />
            <Route path="/answers/:slug" element={<AnswerDetail />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/p/pyron/reserved" element={<PyronReserved />} />
            <Route path="/p/:id" element={<ProductCheckout />} />
            <Route path="/product/:id" element={<ProductCheckout />} />
            <Route path="/ide" element={<IDEHome />} />
            <Route path="/ide/:id" element={<IDE />} />
            <Route path="/boardroom/chameleon" element={<ChameleonHub />} />
            <Route path="/boardroom/solar-harvest" element={<SolarHarvest />} />
            <Route path="/account" element={<Account />} />
            <Route path="/boardroom/ani-provider" element={<AniProvider />} />
            <Route path="/boardroom/ani-ledger" element={<AniLedger />} />
            <Route path="/boardroom/empire-pr" element={<EmpirePRPatch />} />
            <Route path="/boardroom/ani-builder" element={<AniBuilder />} />
            <Route path="/community" element={<Community />} />
            <Route path="/messages" element={<Messages />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <LegalFooter />
        </Suspense>
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
