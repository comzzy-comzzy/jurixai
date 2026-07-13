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
import { WalletProvider } from "@/lib/circle/useWallet";
import { CHAIN_NAME } from "@/lib/chain";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold italic tracking-tight text-foreground">404</h1>
        <h2 className="mt-3 text-sm font-medium text-muted-foreground">Page not found</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you requested has no matching judicial process.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Return home
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
      <div className="max-w-md text-center">
        <h1 className="text-sm font-semibold text-warn">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "Verdict pipeline unreachable."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Home
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
      { name: "apple-mobile-web-app-title", content: "JuriXAI" },
      { name: "application-name", content: "JuriXAI" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#ffffff" },
      {
        name: "description",
        content:
          "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets.",
      },
      { name: "author", content: "JuriXAI" },
      { property: "og:title", content: "JuriXAI — Host a hackathon. AI agents judge it." },
      {
        property: "og:description",
        content:
          "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "JuriXAI — Host a hackathon. AI agents judge it." },
      {
        name: "twitter:description",
        content:
          "Onchain hackathon hosting where AI agents replace human judges and USDC prizes are distributed automatically via Circle wallets.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87bd3e3a-3fc2-4718-bddd-a705facaa20d/id-preview-75c41cfd--1124d60d-7bad-472d-ac6e-4d32acccbc4d.lovable.app-1782424507110.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/87bd3e3a-3fc2-4718-bddd-a705facaa20d/id-preview-75c41cfd--1124d60d-7bad-472d-ac6e-4d32acccbc4d.lovable.app-1782424507110.png",
      },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const isMonad = CHAIN_NAME.includes("MONAD") || CHAIN_NAME.includes("monad");
  return (
    <html lang="en" className={isMonad ? "dark monad-theme" : ""}>
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
  const isMonad = CHAIN_NAME.includes("MONAD") || CHAIN_NAME.includes("monad");

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div className={`min-h-screen flex flex-col bg-background text-foreground ${isMonad ? "dark monad-theme" : ""}`}>
          <TerminalNav />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <Toaster />
      </WalletProvider>
    </QueryClientProvider>
  );
}
