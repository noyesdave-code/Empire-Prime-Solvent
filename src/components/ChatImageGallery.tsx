import { useState } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Img = { src: string; alt?: string };

async function downloadImage(src: string, alt?: string) {
  try {
    const isData = src.startsWith("data:");
    const blob = isData
      ? await (await fetch(src)).blob()
      : await (await fetch(src, { mode: "cors" })).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const name = (alt || "unicorn-image").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "unicorn-image";
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    // CORS-blocked remote image: open in new tab as a fallback
    window.open(src, "_blank", "noopener");
    toast({ title: "Open image to save", description: "Right-click → Save image as…" });
  }
}

function SingleImage({ img }: { img: Img }) {
  const [errored, setErrored] = useState(false);
  const fallback = `https://picsum.photos/seed/${encodeURIComponent((img.alt || "unicorn").slice(0, 40))}/800/600`;
  const src = errored ? fallback : img.src;
  return (
    <div className="relative group my-2">
      <img
        src={src}
        alt={img.alt || ""}
        loading="lazy"
        onError={() => setErrored(true)}
        className="rounded-xl border border-[hsl(var(--emerald-glow))/40] max-w-full h-auto shadow-[0_0_24px_hsl(var(--emerald)/0.3)]"
      />
      <button
        onClick={() => downloadImage(src, img.alt)}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2.5 py-1.5 text-[10px] font-semibold text-fluoro-white border border-[hsl(var(--emerald-glow))/60] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:scale-105"
        aria-label="Download image"
        title="Download image"
      >
        <Download className="h-3 w-3" /> Save
      </button>
    </div>
  );
}

export function ChatImageGallery({ images }: { images: Img[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  if (images.length === 1) return <SingleImage img={images[0]} />;

  const current = images[idx];
  const fallback = `https://picsum.photos/seed/${encodeURIComponent((current.alt || "unicorn").slice(0, 40))}/800/600`;
  return (
    <div className="my-3">
      <div className="relative group rounded-xl overflow-hidden border border-[hsl(var(--emerald-glow))/40] shadow-[0_0_24px_hsl(var(--emerald)/0.3)] bg-background/40">
        <img
          key={current.src}
          src={current.src}
          alt={current.alt || ""}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
          className="w-full h-auto block"
        />
        <button
          onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-[hsl(var(--emerald-glow))/60] text-fluoro-white hover:scale-110 transition-transform"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIdx((i) => (i + 1) % images.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-[hsl(var(--emerald-glow))/60] text-fluoro-white hover:scale-110 transition-transform"
          aria-label="Next image"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          onClick={() => downloadImage(current.src, current.alt)}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2.5 py-1.5 text-[10px] font-semibold text-fluoro-white border border-[hsl(var(--emerald-glow))/60] hover:scale-105 transition-transform"
          aria-label="Download image"
        >
          <Download className="h-3 w-3" /> Save
        </button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-fluoro-white border border-[hsl(var(--emerald-glow))/40]">
          {idx + 1} / {images.length}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {images.map((im, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-12 w-12 rounded-md overflow-hidden border-2 transition-all ${i === idx ? "border-[hsl(var(--emerald-glow))] scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}
            aria-label={`View image ${i + 1}`}
          >
            <img src={im.src} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Extract all markdown image tokens from a message (returns the images and the
// remaining markdown text with those images stripped out).
const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
export function extractMarkdownImages(text: string): { images: Img[]; text: string } {
  const images: Img[] = [];
  const cleaned = text.replace(IMG_RE, (_m, alt, src) => {
    images.push({ src: String(src), alt: String(alt || "") });
    return "";
  });
  return { images, text: cleaned };
}
