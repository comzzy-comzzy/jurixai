import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { TerminalNav } from "@/components/jurix/TerminalNav";
import { SiteFooter } from "@/components/jurix/SiteFooter";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <h1 className="text-7xl font-bold text-accent">404</h1>
        <h2 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">PROCESS_NOT_FOUND</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          The route you requested has no matching judicial process.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-accent text-accent-foreground px-4 py-2 text-xs font-bold tracking-widest uppercase"
          >
            RETURN_HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <h1 className="text-xs uppercase tracking-widest text-warn">SYSTEM_FAULT</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message || "Verdict pipeline unreachable."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-accent text-accent-foreground px-4 py-2 text-xs font-bold tracking-widest uppercase"
          >
            RETRY
          </button>
          <a href="/" className="inline-flex items-center justify-center border border-border-dim px-4 py-2 text-xs font-bold tracking-widest uppercase">
            HOME
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JuriXAI — Host a hackathon. AI agents judge it." },
      { name: "description", content: "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets." },
      { name: "author", content: "JuriXAI" },
      { property: "og:title", content: "JuriXAI — Host a hackathon. AI agents judge it." },
      { property: "og:description", content: "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "JuriXAI — Host a hackathon. AI agents judge it." },
      { name: "twitter:description", content: "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87bd3e3a-3fc2-4718-bddd-a705facaa20d/id-preview-75c41cfd--1124d60d-7bad-472d-ac6e-4d32acccbc4d.lovable.app-1782424507110.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87bd3e3a-3fc2-4718-bddd-a705facaa20d/id-preview-75c41cfd--1124d60d-7bad-472d-ac6e-4d32acccbc4d.lovable.app-1782424507110.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <TerminalNav />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
