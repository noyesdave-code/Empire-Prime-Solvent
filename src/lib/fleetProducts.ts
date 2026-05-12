// Single source of truth for the PGVA Ventures fleet (investor portfolio dossier).
//
// Each product is a single entity owned by PGVA Ventures LLC dba Unicorn Corporation.
// Surfacing one inside Unicorn Box™ = a *build slot* — Unicorn Box outsources the
// materials and build, applies our fee, and quotes the customer a turnkey price.
// The fleet entry remains the canonical record; nothing is duplicated as a brand.

export type FleetStage = "active" | "concept";

export type BuildEstimate = {
  /** Outsourced materials / BOM range (USD) */
  materials: string;
  /** Outsourced labor / build cost range (USD) */
  outsourceBuild: string;
  /** Approximate build / fulfilment time */
  buildDays: string;
  /** Unicorn Box service fee (USD) */
  ourFee: string;
  /** Quoted customer price range (materials + build + fee) */
  total: string;
};

export type FleetProduct = {
  id: string;
  display: string;
  name: string;
  tagline: string;
  /** Long-form description sourced from the investor dossier hard copies */
  description: string;
  valuation: string;
  moat: string;
  stage: FleetStage;
  sector: string;
  /** What Unicorn Box ships against this brand for the customer */
  uboxDeliverable: string;
  /** Turnkey build cost calculator: outsourced materials + build + our fee */
  build: BuildEstimate;
};

export const FLEET_PRODUCTS: FleetProduct[] = [
  {
    id: "pyron",
    name: "PYRON",
    display: "PYRON™",
    tagline: "Phone case with embedded supercapacitor charging.",
    description:
      "PYRON is a phone case with an embedded supercapacitor that charges itself from kinetic motion, ambient RF, and trickle-charge. Pull it off the wall and it has hours of emergency power baked in — no cable. Patent-pending thermal/topology IP makes the form factor possible without adding bulk. Pre-orders open, iPhone first, then Android flagships. Hardware sales $79/$129/$199 with a battery-as-a-service expansion in year 2.",
    valuation: "$60M – $300M",
    moat: "Patent-pending thermal/topology IP; iPhone-first preorder, Android flagship expansion, year-2 battery-as-a-service.",
    stage: "active",
    sector: "Product / Preorder · Mobile accessories",
    uboxDeliverable:
      "Pre-order landing page ($79/$129/$199 tiers), spec sheet, viral hardware launch kit, battery-as-a-service brand pack.",
    build: {
      materials: "$28 – $42",
      outsourceBuild: "$18 – $24",
      buildDays: "21 – 35 days",
      ourFee: "$54",
      total: "$100 – $120 build cost · retails $79 / $129 / $199",
    },
  },
  {
    id: "heatsink",
    name: "HEATSINK",
    display: "HEATSINK™",
    tagline: "Passive thermal regulation for high-density servers.",
    description:
      "HEATSINK is passive thermal regulation for high-density servers. The GPU era has created a thermal crisis in datacenters — every watt of compute is a watt of heat that has to go somewhere. HEATSINK uses materials and geometry IP to dissipate heat passively, reducing cooling costs and enabling denser deployments. Datacenter pilot within 12 months.",
    valuation: "$40M – $160M",
    moat: "Materials + geometry IP for passive dissipation; datacenter pilot within 12 months.",
    stage: "active",
    sector: "Product / In-Development · Datacenter thermal",
    uboxDeliverable:
      "B2B pilot one-pager, datacenter outreach sequence, technical brief, GPU-era positioning kit.",
    build: {
      materials: "$140 – $220",
      outsourceBuild: "$60 – $90",
      buildDays: "30 – 45 days",
      ourFee: "$180",
      total: "$380 – $490 per unit",
    },
  },
  {
    id: "harvestlink",
    name: "HARVESTLINK",
    display: "HARVESTLINK™",
    tagline: "Edge harvest telemetry for small farms.",
    description:
      "HARVESTLINK puts crop-specific edge AI in the hands of the small and mid-size farms that the big agtech vendors ignore. Plug-and-play telemetry, calibrated per crop, that pays for itself inside a single growing season.",
    valuation: "$15M – $60M",
    moat: "Edge-AI + crop-specific sensor calibration.",
    stage: "active",
    sector: "AgTech",
    uboxDeliverable:
      "Co-op rollout deck, agtech-grant application template, farmer onboarding flow, telemetry brand kit.",
    build: {
      materials: "$80 – $130",
      outsourceBuild: "$45 – $70",
      buildDays: "25 – 40 days",
      ourFee: "$120",
      total: "$245 – $320 per unit",
    },
  },
  {
    id: "wattshare",
    name: "WATTSHARE",
    display: "WATTSHARE™",
    tagline: "Peer-to-peer residential power sharing.",
    description:
      "WATTSHARE is the local-grid software that lets neighbors share rooftop solar and battery capacity peer-to-peer. Sits on top of the utility, not against it — earns its keep through HOA pilots and utility integration deals.",
    valuation: "$5M – $30M",
    moat: "Local-grid software + utility integrations.",
    stage: "concept",
    sector: "Energy / grid",
    uboxDeliverable:
      "HOA pilot proposal, utility-partnership pitch, regulatory brief, P2P-energy brand pack.",
    build: {
      materials: "$0 (software)",
      outsourceBuild: "$3,200 – $5,400",
      buildDays: "45 – 60 days",
      ourFee: "$2,400",
      total: "$5,600 – $7,800 per pilot",
    },
  },
  {
    id: "brownout",
    name: "BROWNOUT",
    display: "BROWNOUT™",
    tagline: "Grid-event auto-throttling for appliances.",
    description:
      "BROWNOUT is the edge-firmware layer appliance OEMs bundle to auto-throttle during grid stress events — protecting customers from outages and unlocking utility demand-response payments.",
    valuation: "$5M – $25M",
    moat: "Edge-firmware + appliance OEM relationships.",
    stage: "concept",
    sector: "Energy / appliances",
    uboxDeliverable:
      "Utility-bundle pitch deck, OEM intro sequence, firmware-positioning brand kit.",
    build: {
      materials: "$12 – $22",
      outsourceBuild: "$28 – $45",
      buildDays: "30 – 50 days",
      ourFee: "$95",
      total: "$135 – $165 per unit",
    },
  },
  {
    id: "shelflife",
    name: "SHELFLIFE",
    display: "SHELFLIFE™",
    tagline: "Smart pantry expiry tracking.",
    description:
      "SHELFLIFE uses a small in-pantry camera and a recipe-graph integration to tell you what's about to spoil and what to cook with it tonight. Subscription consumer hardware with a household-waste reduction story baked in.",
    valuation: "$3M – $15M",
    moat: "Computer-vision + recipe graph integration.",
    stage: "concept",
    sector: "Consumer hardware / kitchen",
    uboxDeliverable:
      "Subscription consumer-hardware landing page, recipe-graph brand pack, waste-reduction launch kit.",
    build: {
      materials: "$34 – $52",
      outsourceBuild: "$22 – $34",
      buildDays: "21 – 35 days",
      ourFee: "$72",
      total: "$130 – $160 per unit",
    },
  },
  {
    id: "microfeed",
    name: "MICROFEED",
    display: "MICROFEED™",
    tagline: "Compact protein-grade aquaculture feeder.",
    description:
      "MICROFEED is the compact, species-tuned feeder for protein-grade aquaculture operations that are too small for industrial rigs and too serious for consumer gear. Mechanical IP plus species-specific dosing models = a niche-margin moat.",
    valuation: "$5M – $20M",
    moat: "Mechanical IP + species-specific dosing models.",
    stage: "concept",
    sector: "Aquaculture B2B",
    uboxDeliverable:
      "Aquaculture B2B sales sheet, species-dosing spec brief, niche-margin brand pack.",
    build: {
      materials: "$190 – $280",
      outsourceBuild: "$120 – $180",
      buildDays: "35 – 50 days",
      ourFee: "$240",
      total: "$550 – $700 per unit",
    },
  },
  {
    id: "subkill",
    name: "SUBKILL",
    display: "SUBKILL™",
    tagline: "Hybrid AI service to negotiate down recurring bills.",
    description:
      "SUBKILL is the hybrid-AI concierge that hunts down silent subscriptions and negotiates recurring bills (cable, insurance, gym, SaaS) on the customer's behalf. Performance-fee model — we only get paid when the customer saves.",
    valuation: "$15M – $50M",
    moat: "Negotiation playbooks + provider relationships.",
    stage: "concept",
    sector: "Consumer fintech",
    uboxDeliverable:
      "Performance-fee landing page, viral consumer launch kit, negotiation-playbook brand pack.",
    build: {
      materials: "$0 (software)",
      outsourceBuild: "$1,200 – $2,400",
      buildDays: "21 – 35 days",
      ourFee: "$1,500",
      total: "$2,700 – $3,900 per onboarded customer cohort",
    },
  },
  {
    id: "taxback",
    name: "TAXBACK",
    display: "TAXBACK™",
    tagline: "Found-money tax recovery for individuals.",
    description:
      "TAXBACK is the found-money tax recovery service that scans the last seven years of an individual's filings for missed credits and refunds. IRS-workflow integrations + a refund engine that pays back inside 90 days.",
    valuation: "$10M – $40M",
    moat: "Refund-engine logic + IRS workflow integrations.",
    stage: "concept",
    sector: "Consumer fintech",
    uboxDeliverable:
      "Seasonal acquisition funnel, IRS-workflow spec brief, < 90-day-payback brand pack.",
    build: {
      materials: "$0 (software)",
      outsourceBuild: "$1,800 – $3,200",
      buildDays: "30 – 45 days",
      ourFee: "$1,800",
      total: "$3,600 – $5,000 per launch funnel",
    },
  },
  {
    id: "leaksense",
    name: "LEAKSENSE",
    display: "LEAKSENSE™",
    tagline: "Sub-meter household water-leak detection.",
    description:
      "LEAKSENSE is the acoustic-ML water-leak detector that mounts at the household sub-meter and pinpoints leaks before they become claims. Goes to market through homeowner insurance bundles.",
    valuation: "$5M – $25M",
    moat: "Acoustic ML + insurance partner channel.",
    stage: "concept",
    sector: "Consumer hardware / insurance",
    uboxDeliverable:
      "Insurance-bundle pitch, homeowner landing page, acoustic-ML positioning kit.",
    build: {
      materials: "$48 – $72",
      outsourceBuild: "$28 – $42",
      buildDays: "25 – 40 days",
      ourFee: "$110",
      total: "$190 – $230 per unit",
    },
  },

  // === New additions from the dossier hard-copy pages ===

  {
    id: "voiceforge",
    name: "VoiceForge",
    display: "VoiceForge™",
    tagline: "Talk to your 3D printer. It just makes it.",
    description:
      "Talk to your 3D printer and it just makes it. VoiceForge is the always-listening, wake-word-first companion that lets a 7-year-old or a grandparent print exactly what they need by describing it out loud. Sister product to PrintPilot — same brain, different mouth. Free app + $12/mo Pro + $49 mic puck (one-time) + OEM firmware embed for printer makers. The wake-word detection runs entirely on-device, which is both a privacy moat and a regulatory shield.",
    valuation: "$15M – $60M",
    moat: "On-device wake-word detection — privacy moat + regulatory shield.",
    stage: "active",
    sector: "Consumer AI / Voice interface",
    uboxDeliverable:
      "App landing page, $49 mic-puck pre-order funnel, OEM firmware-embed pitch, wake-word brand pack.",
    build: {
      materials: "$11 – $16 (mic puck BOM)",
      outsourceBuild: "$8 – $12",
      buildDays: "18 – 28 days",
      ourFee: "$22",
      total: "$41 – $50 per puck (retail $49)",
    },
  },
  {
    id: "printpilot",
    name: "PrintPilot",
    display: "PrintPilot™",
    tagline: "The AI copilot for every 3D printer in the home.",
    description:
      "By 2030 every home has an AI assistant and a 3D printer. The bottleneck is not the printer — it is the software that turns 'I need a wall mount for my doorbell camera' into a print-ready file. PrintPilot owns that layer across every brand of printer. Free tier + $9/mo Pro. Hardware-agnostic, so it rides every printer manufacturer's growth curve.",
    valuation: "$20M – $80M",
    moat: "Hardware-agnostic — rides every printer maker's growth curve.",
    stage: "active",
    sector: "Consumer AI / Hardware-adjacent SaaS",
    uboxDeliverable:
      "Free-to-Pro SaaS landing page, $9/mo upgrade funnel, printer-OEM partnership brief, copilot brand pack.",
    build: {
      materials: "$0 (software)",
      outsourceBuild: "$2,800 – $4,400",
      buildDays: "30 – 45 days",
      ourFee: "$1,800",
      total: "$4,600 – $6,200 per launch",
    },
  },
  {
    id: "factoryai",
    name: "FactoryAI",
    display: "FactoryAI™",
    tagline: "AI-native manufacturing & industrial copilot.",
    description:
      "FactoryAI is the AI-native manufacturing copilot. Industrial AI is Jensen Huang's #1 long-arc bet, and FactoryAI sits at the intersection of vision, robotics, and operations software for the factory floor. Pilot-to-production in 18 months, with multi-decade tailwind from re-shoring and software-defined manufacturing. The moat is vertical fine-tuning plus factory-data network effects that strengthen with every plant onboarded.",
    valuation: "$50M – $200M",
    moat: "Vertical fine-tuning + factory-data network effects.",
    stage: "active",
    sector: "Industrial / Robotics",
    uboxDeliverable:
      "Pilot-program proposal deck, factory-floor outreach sequence, industrial-AI brand pack, partner-OEM brief.",
    build: {
      materials: "$0 (software + integration)",
      outsourceBuild: "$8,500 – $14,000",
      buildDays: "60 – 90 days",
      ourFee: "$6,500",
      total: "$15,000 – $20,500 per pilot",
    },
  },
  {
    id: "researchai",
    name: "ResearchAI",
    display: "ResearchAI™",
    tagline: "Autonomous R&D and scientific literature engine.",
    description:
      "ResearchAI is an autonomous R&D and scientific literature engine. Compute-bound discovery — drugs, materials, climate models — is the durable, decade-long AI category. ResearchAI accelerates the literature review, hypothesis generation, and experimental design loop. Research-license revenue by Q3, enterprise lock-in thereafter. Curated corpora plus reasoning chains tuned to peer-reviewed science.",
    valuation: "$30M – $120M",
    moat: "Curated peer-reviewed corpora + tuned reasoning chains = enterprise lock-in.",
    stage: "active",
    sector: "Discovery / R&D AI",
    uboxDeliverable:
      "Research-license landing page, lab/enterprise outreach sequence, corpus-licensing brief, R&D-AI brand pack.",
    build: {
      materials: "$0 (software + corpus licensing)",
      outsourceBuild: "$5,200 – $9,500",
      buildDays: "45 – 75 days",
      ourFee: "$3,800",
      total: "$9,000 – $13,300 per research license",
    },
  },
  {
    id: "climateai",
    name: "ClimateAI",
    display: "ClimateAI™",
    tagline: "Grid + climate optimisation modelling.",
    description:
      "ClimateAI is grid and climate optimization modeling. Energy is the hard constraint of the AI era — every datacenter buildout is now an energy negotiation. ClimateAI sells physics-aware models to utilities for grid optimization and to corporations for science-based carbon analytics. Utility pilots within 12 months, with regulatory tailwind from the 2026+ grid-modernization mandates.",
    valuation: "$40M – $180M",
    moat: "Physics-aware models + regulatory tailwind from 2026 grid-modernization mandates.",
    stage: "active",
    sector: "Energy / Climate",
    uboxDeliverable:
      "Utility-pilot proposal deck, corporate carbon-analytics one-pager, regulatory brief, grid-software brand pack.",
    build: {
      materials: "$0 (software + model licensing)",
      outsourceBuild: "$6,800 – $11,500",
      buildDays: "50 – 80 days",
      ourFee: "$4,500",
      total: "$11,300 – $16,000 per utility pilot",
    },
  },
  {
    id: "lexai",
    name: "LexAI",
    display: "LexAI™",
    tagline: "Always-on legal counsel & contract intelligence.",
    description:
      "LexAI is always-on legal counsel and contract intelligence. Regulated industries adopt slowly but pay forever — and once a law firm or in-house team puts your tool in the workflow, replacing it requires re-validating audit trails. Mid-market wins by Q4, with 90%+ gross margins typical of legaltech. Jurisdiction-specific corpora plus compliance-grade audit logs.",
    valuation: "$25M – $100M",
    moat: "Jurisdiction-specific corpora + compliance-grade audit logs = workflow lock-in.",
    stage: "active",
    sector: "Regulated / Legal",
    uboxDeliverable:
      "Mid-market law-firm landing page, in-house counsel outreach sequence, compliance-audit brief, legaltech brand pack.",
    build: {
      materials: "$0 (software + jurisdiction corpus licensing)",
      outsourceBuild: "$4,800 – $8,400",
      buildDays: "40 – 65 days",
      ourFee: "$3,400",
      total: "$8,200 – $11,800 per firm onboarding",
    },
  },
  {
    id: "bookkeepai",
    name: "BookkeepAI",
    display: "BookkeepAI™",
    tagline: "Autonomous accounting + reconciliation.",
    description:
      "BookkeepAI is autonomous accounting and reconciliation. Recurring back-office work is the natural home of agentic AI for the next decade — it's high-frequency, rule-bound, and currently done by humans paid by the hour. 100 SMB accounts by Q3 target, with 130%+ net revenue retention as customers expand from bookkeeping into payroll, AP/AR, and tax prep.",
    valuation: "$20M – $90M",
    moat: "High-frequency rule-bound workflows + 130%+ NRR expansion into payroll, AP/AR, and tax prep.",
    stage: "active",
    sector: "Business / Financial Automation",
    uboxDeliverable:
      "SMB-accountant landing page, bookkeeper outreach sequence, AP/AR + payroll expansion brief, financial-automation brand pack.",
    build: {
      materials: "$0 (software + ledger/payroll API licensing)",
      outsourceBuild: "$4,200 – $7,800",
      buildDays: "35 – 60 days",
      ourFee: "$3,200",
      total: "$7,400 – $11,000 per SMB onboarding",
    },
  },
  {
    id: "codereviewai",
    name: "CodeReview AI",
    display: "CodeReview AI™",
    tagline: "Pull-request review that understands the codebase.",
    description:
      "CodeReview AI is pull-request review that understands the whole codebase, not just the diff. Devtools compound: every line of code shipped multiplies platform leverage. Bottom-up adoption from individual developers, then expansion to teams. The moat is repo-level context retention that single-file review tools cannot match.",
    valuation: "$35M – $150M",
    moat: "Repo-level context retention + bottom-up developer adoption that single-file review tools cannot match.",
    stage: "active",
    sector: "Business / Developer Infrastructure",
    uboxDeliverable:
      "Developer landing page, GitHub/GitLab integration brief, team-expansion outreach sequence, devtools brand pack.",
    build: {
      materials: "$0 (software + LLM/code-index licensing)",
      outsourceBuild: "$5,400 – $9,200",
      buildDays: "45 – 70 days",
      ourFee: "$3,600",
      total: "$9,000 – $12,800 per team onboarding",
    },
  },
  {
    id: "tutormindai",
    name: "TutorMind AI",
    display: "TutorMind AI™",
    tagline: "Personalized AI tutor across K-12 and adult learning.",
    description:
      "TutorMind AI is a personalized AI tutor across K-12 and adult learning. Education is a permanent demand curve, accelerated by the post-pandemic learning gap and AI-native pedagogy. Direct-to-consumer B2C plus district pilots. The moat is a mastery-graph pedagogy that adapts to each student plus a parent/teacher trust loop reinforced by transparent progress reporting.",
    valuation: "$20M – $85M",
    moat: "Mastery-graph pedagogy + parent/teacher trust loop reinforced by transparent progress reporting.",
    stage: "active",
    sector: "Business / Education",
    uboxDeliverable:
      "Parent/student B2C landing page, district-pilot proposal deck, teacher trust-loop brief, edtech brand pack.",
    build: {
      materials: "$0 (software + curriculum/corpus licensing)",
      outsourceBuild: "$4,600 – $8,200",
      buildDays: "40 – 65 days",
      ourFee: "$3,300",
      total: "$7,900 – $11,500 per district/school onboarding",
    },
  },
  {
    id: "mindflowai",
    name: "MindFlow AI",
    display: "MindFlow AI™",
    tagline: "Agentic productivity OS for builders.",
    description:
      "MindFlow AI is an agentic productivity OS for builders. Agent OSs are still greenfield — winners take a generation, the way Notion and Slack did in their categories. Power-user wedge first (developers, designers, founders), then platform expansion. The moat is a workflow library plus a cross-app context layer that makes the agents more useful with every integration added.",
    valuation: "$40M – $170M",
    moat: "Workflow library + cross-app context layer that compounds with every integration added.",
    stage: "active",
    sector: "Business / Agentic Productivity",
    uboxDeliverable:
      "Power-user landing page, builder/founder outreach sequence, integration-roadmap brief, agentic-OS brand pack.",
    build: {
      materials: "$0 (software + integration/API licensing)",
      outsourceBuild: "$5,600 – $9,800",
      buildDays: "45 – 75 days",
      ourFee: "$3,800",
      total: "$9,400 – $13,600 per workspace onboarding",
    },
  },
  {
    id: "unicornmark",
    name: "Unicorn Mark",
    display: "Unicorn Mark™",
    tagline: "Hardware identity token for the AI Builder fleet.",
    description:
      "Unicorn Mark is a hardware identity token for the entire AI Builder fleet. Cross-fleet single-sign-on, device pairing, and ecosystem unlocks all flow through this one cryptographic standard. Owned by PGVA. The flywheel: every additional Unicorn product makes Mark more valuable.",
    valuation: "$10M – $45M",
    moat: "Cryptographic device-identity standard owned by PGVA — every new Unicorn product compounds Mark's value.",
    stage: "concept",
    sector: "Product / Concept · Identity hardware",
    uboxDeliverable:
      "Developer-preview landing page, fleet-SSO spec sheet, hardware-pairing brief, identity-standard brand pack.",
    build: {
      materials: "$8 – $14 (secure element + housing)",
      outsourceBuild: "$6 – $10",
      buildDays: "30 – 60 days (concept → first production run)",
      ourFee: "$22",
      total: "$36 – $46 build cost · retails $79 per device",
    },
  },
  {
    id: "unicornbox",
    name: "Unicorn Box",
    display: "Unicorn Box™",
    tagline: "Your own automated micro-business in 24 hours.",
    description:
      "Unicorn Box is the highest-revenue product in the portfolio: pick a vertical, and the AI runs the entire micro-business for you. Product selection, store setup, marketing, sales, customer support, and fulfillment — all autonomous, all in 24 hours. The dream of 'passive income' has always been blocked by execution complexity. Unicorn Box collapses that complexity into one decision: which vertical do you want? The AI handles the rest. Print-on-demand merch, dropshipping, digital products, subscription boxes — each vertical is a templated playbook. Serves first-time founders, side-hustle operators, and people exiting traditional employment who want a real revenue stream without learning Shopify, Klaviyo, Meta Ads, and customer support from scratch. Aggressive land-and-expand: customers typically run 2–3 Boxes. Target: 1,000 paying boxes within 12 months = $1.16M ARR from this single product.",
    valuation: "$30M – $150M",
    moat: "Outcome-agnostic templated playbooks + AI support agent online; customers run 2–3 Boxes (land-and-expand).",
    stage: "active",
    sector: "Flagship · Automated micro-business SaaS",
    uboxDeliverable:
      "Live checkout, vertical-template library, AI support agent, founder onboarding playbook, flagship brand pack.",
    build: {
      materials: "$0 (software + Shopify/Klaviyo/Meta API licensing)",
      outsourceBuild: "$0 (in-house automation + AI agents)",
      buildDays: "24 hours from signup → live store",
      ourFee: "$97 / month per active Box",
      total: "$97/mo per Box · 2–3 Boxes typical · $1.16M ARR target at 1,000 boxes",
    },
  },
  {
    id: "personalpulse",
    name: "Personal-Pulse",
    display: "Personal-Pulse™",
    tagline: "Your AI Chief of Staff — a Bloomberg dashboard for your body.",
    description:
      "Personal Pulse is two things in one. First, the original concept: an AI Chief of Staff that unifies calendar, money, health, and life-goals across a single context graph. Second, the new flagship Personal Pulse Vitals — a stock-market-style live ticker for your body that displays every major organ, system, blood marker, and vital sign as a tradeable symbol with a dollar value and live health percentage. Health data today is fragmented across Apple Health, Fitbit, Whoop, Oura, lab portals, and doctor PDFs. Personal Pulse Vitals turns the body into a Bloomberg dashboard: HRT (Heart) 87.6%, LIV (Liver) 91.2%, OXY (Blood Oxygen) 98.4% — a real-time read on the most valuable asset you'll ever own. Serves quantified-self enthusiasts, biohackers, longevity-focused professionals, and ultimately anyone with a wearable. B2B2C upside through corporate wellness and concierge-medicine partners. Free waitlist + ticker today; paid tier with the mobile app: $14.99/mo personal, $24.99/mo family share, $49.99/mo concierge with monthly trend reviews. Lifetime founders' pricing for waitlist signups.",
    valuation: "$30M – $110M",
    moat: "Unified body-context graph across wearables/labs/PDFs + Bloomberg-style vitals ticker; land-and-expand from personal → family → concierge.",
    stage: "active",
    sector: "Flagship · Personal health intelligence",
    uboxDeliverable:
      "Live waitlist landing page, vitals-ticker demo, founders'-pricing capture, mobile-app preorder funnel, concierge-medicine partner brief.",
    build: {
      materials: "$0 (software + Apple Health / Fitbit / Whoop / Oura / lab API licensing)",
      outsourceBuild: "$0 (in-house Vitals engine + AI Chief of Staff agents)",
      buildDays: "Live today (waitlist + ticker) · mobile-app paid tier next sprint",
      ourFee: "$14.99 / $24.99 / $49.99 per month",
      total: "$14.99 personal · $24.99 family · $49.99 concierge / mo · lifetime founders' lock for waitlist",
    },
  },
  {
    id: "unicornaibuilder",
    name: "Unicorn AI Builder",
    display: "Unicorn AI Builder™",
    tagline: "The umbrella that builds the rest.",
    description:
      "PGVA Ventures LLC is the legal vehicle. Unicorn AI Builder is the brand. Inside it sits a single agentic operating layer that runs 26 brands in parallel — flagships like Unicorn Box, Poke-Pulse, Personal Pulse Vitals, Unicorn Emerald, and Stock-Pulse; specialised AI businesses spanning manufacturing, legal, climate, accounting, and agentic productivity; and hardware/consumer products led by PYRON and HEATSINK. The Builder removes the ceiling that stops solo founders: every product launch — landing page, payment system, customer pipeline, content engine, analytics — is templated, AI-generated, and shippable in hours instead of quarters. The compounding effect is the moat: each new launch makes the next launch faster, and every brand reinforces the others through a shared design system, shared content engine, and shared customer-acquisition layer.",
    valuation: "$250M – $1B (24-mo target)",
    moat: "26-brand fan-out + shared agentic operating layer + founder-velocity flywheel that compounds each new launch.",
    stage: "active",
    sector: "Executive Summary · AI portfolio operating system",
    uboxDeliverable:
      "Portfolio overview page, flagship funnel map, shared content engine brief, customer-acquisition system spec, investor-ready executive summary.",
    build: {
      materials: "$0 (software + shared automation stack)",
      outsourceBuild: "$0 (built across the in-house Builder operating layer)",
      buildDays: "Hours per new launch once templates and systems are in place",
      ourFee: "Captured through flagship products and shared operating leverage",
      total: "$97/mo Unicorn Box · $19/$79 Poke-Pulse · $39/$99 Stock-Pulse · $14.99/$24.99/$49.99 Personal-Pulse · portfolio target $500 MRR in 90 days, $5K MRR in 12 months, $50K MRR in 24 months",
    },
  },
  {
    id: "knowledgebank",
    name: "Knowledge Bank",
    display: "Knowledge Bank™",
    tagline: "AI-indexed personal memory for founders.",
    description:
      "Knowledge Bank is an AI-indexed personal memory layer for founders. Every doc, voice note, Slack thread, email, decision log, and meeting transcript becomes searchable in plain language forever — a founder's entire operating brain in one private vault. Founders forget; the cost of forgetting is the same decision relitigated, the same lesson relearned, the same playbook rewritten. Ask 'what did we decide about the Q2 pricing change?' and get the actual decision back with the conversation that produced it. Serves solo founders and small leadership teams (2–10 people) where institutional memory lives in one or two heads, expanding into mid-market once the founder loop is dialed in. Founder $29/mo single user · Team $99/mo up to 10 users · Vault $499/mo unlimited + dedicated infrastructure for sensitive industries.",
    valuation: "$15M – $70M",
    moat: "Private founder context graph across docs/voice/Slack/email + plain-language recall that compounds with every new artifact ingested.",
    stage: "active",
    sector: "Flagship · Founder memory & knowledge",
    uboxDeliverable:
      "Live landing page at /knowledge-bank, ingestion connectors brief (Slack/email/Drive/voice), plain-language recall demo, three-tier pricing capture, sensitive-industry vault spec.",
    build: {
      materials: "$0 (software + embedding/storage + Slack/email/Drive/voice connector APIs)",
      outsourceBuild: "$0 (in-house ingestion + recall agents on the shared Builder stack)",
      buildDays: "Live today at /knowledge-bank · ongoing connector + recall depth in continuous sprints",
      ourFee: "$29 / $99 / $499 per month",
      total: "$29/mo Founder · $99/mo Team (up to 10) · $499/mo Vault (unlimited + dedicated infra)",
    },
  },
  {
    id: "stockpulse",
    name: "Stock-Pulse",
    display: "Stock-Pulse™",
    tagline: "AI BUY/SELL signals on stocks, futures & crypto.",
    description:
      "Stock-Pulse is an AI-driven market intelligence terminal generating BUY/SELL/HOLD signals across stocks, futures, and crypto. Unlike most signal services, the methodology is shown publicly — every signal is back-tested with Sharpe and Sortino ratios visible to the user. Retail traders are drowning in influencers, paid Discord groups, and pump-and-dump schemes; Stock-Pulse is the antidote: transparent math, public back-tests, and a paper-trading wallet so users can verify the system before risking real money. Serves retail allocators, prop-firm hopefuls, and small RIAs looking for a defensible signal source, with a secondary educational use by trading-focused content creators. Free tier with paper-trading wallet · Pro $39/mo (live signals + custom watchlists) · Elite $99/mo (auto-trader engine, futures signals, API). Affiliate revenue from broker referrals.",
    valuation: "$50M – $200M",
    moat: "Transparent back-tested signal methodology (Sharpe/Sortino public) + paper-trading wallet trust loop + auto-trader API stickiness.",
    stage: "active",
    sector: "Flagship · Market intelligence terminal",
    uboxDeliverable:
      "Live terminal at /stock-pulse with signal snapshots and back-test results, paper-trading wallet onboarding, three-tier pricing capture, broker affiliate funnel, auto-trader API brief.",
    build: {
      materials: "$0 (software + market-data feeds + broker affiliate APIs)",
      outsourceBuild: "$0 (in-house signal engine + back-test pipeline on the shared Builder stack)",
      buildDays: "Live today at /stock-pulse · auto-trader engine and futures signals in next sprint",
      ourFee: "Free / $39 / $99 per month + broker affiliate revenue",
      total: "Free paper-trading · $39/mo Pro live signals · $99/mo Elite auto-trader + futures + API",
    },
  },
  {
    id: "unicornemerald",
    name: "Unicorn Emerald",
    display: "Unicorn Emerald™",
    tagline: "The autonomous business engine.",
    description:
      "Unicorn Emerald is an autonomous business engine — an always-on COO that runs marketing, sales, and operations for any small-to-medium business. It plugs into the customer's existing tools and handles outreach, follow-ups, content, scheduling, and reporting without supervision. Most SMBs cannot afford a COO; Emerald replaces a $180K/year hire with a $497/month subscription that never sleeps, never forgets, and gets faster every week. The closed-loop optimization compounds — every customer interaction trains the engine to do better tomorrow. Serves service businesses, e-commerce stores, agencies, and consultancies doing $250K–$5M ARR who cannot justify a full-time ops hire but desperately need one. Tiered SaaS: Starter $97/mo · Growth $297/mo · Scale $897/mo, plus an outcome-based add-on (% of recovered revenue) for win-back campaigns.",
    valuation: "$100M – $400M",
    moat: "Closed-loop optimization across each customer's stack + outcome-based pricing + COO-replacement positioning that compounds with every interaction.",
    stage: "active",
    sector: "Flagship · Autonomous business engine",
    uboxDeliverable:
      "Live landing page, three-tier pricing capture, autonomous-outreach demo across 100+ targets, tool-integration brief, outcome-based win-back add-on funnel.",
    build: {
      materials: "$0 (software + LLM + CRM/email/calendar/content API integrations)",
      outsourceBuild: "$0 (in-house Emerald agent stack on the shared Builder operating layer)",
      buildDays: "Live today · autonomous outreach already running across 100+ targets",
      ourFee: "$97 / $297 / $897 per month + % of recovered revenue (win-back add-on)",
      total: "$97/mo Starter · $297/mo Growth · $897/mo Scale · outcome-based win-back add-on",
    },
  },
  {
    id: "unicornmarble",
    name: "Unicorn Marble",
    display: "Unicorn Marble™",
    tagline: "The premium consumer surface for the ecosystem.",
    description:
      "Unicorn Marble is the premium consumer surface for the entire ecosystem — the Apple-grade design system, brand voice, and front-door experience that every product in the portfolio inherits. It is what makes a Unicorn product feel like a Unicorn product. B2C trust collapses without design quality; Marble is the design discipline encoded as a reusable system: typography, color, motion, accessibility minimums (44px tap targets, AAA contrast, reduced-motion respect), copy patterns, and error-state etiquette. Every flagship loads it before it loads anything else. Serves internally — every Unicorn brand's customers — and externally, eventually licensed as a turnkey design system to other AI-native startups. Indirect revenue today (raises conversion across all flagships); direct in 18 months as a licensed design framework: $299/mo per startup, white-glove $4,999 onboarding.",
    valuation: "$40M – $120M",
    moat: "Apple-grade design system encoded as code + accessibility/copy/motion discipline shared across every flagship + licensing path to other AI-native startups.",
    stage: "active",
    sector: "Flagship · Design system & brand surface",
    uboxDeliverable:
      "Live design-system reference page, accessibility minimums spec (44px / AAA / reduced-motion), typography + color + motion tokens, licensed-framework onboarding funnel ($299/mo + $4,999 white-glove).",
    build: {
      materials: "$0 (design tokens + Tailwind + shared component library)",
      outsourceBuild: "$0 (in-house Marble system on the shared Builder operating layer)",
      buildDays: "Live today · embedded across the entire fleet",
      ourFee: "Indirect (lifts conversion across all flagships) → $299/mo + $4,999 onboarding (18-mo licensing)",
      total: "Indirect today · $299/mo per licensed startup + $4,999 white-glove onboarding (18-mo)",
    },
  },
];

export const getFleetProduct = (id: string) =>
  FLEET_PRODUCTS.find((p) => p.id === id);
