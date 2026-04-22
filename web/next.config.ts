import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MVP-1 IA route aliases per docs/FINTREST_UX_SPEC.md §02 + §23.
  // Sidebar points at canonical spec paths (/my/*, /research, /audit,
  // /inbox); we rewrite them to existing page files rather than move
  // the files — lower risk, zero broken imports. Full renames happen
  // in MVP-2 when the ship pressure is off.
  async rewrites() {
    return [
      // "My stuff" pillar — existing /portfolio, /watchlist, /boards
      // pages serve the spec-canonical /my/* paths.
      { source: "/my/portfolio",        destination: "/portfolio" },
      { source: "/my/portfolio/:slug*", destination: "/portfolio/:slug*" },
      { source: "/my/watchlist",        destination: "/watchlist" },
      { source: "/my/boards",           destination: "/boards" },
      { source: "/my/boards/:slug*",    destination: "/boards/:slug*" },

      // "Research" pillar — Today's drop is the default sub-tab; the
      // existing /dashboard page carries that content until a dedicated
      // /research/page.tsx is built.
      { source: "/research",            destination: "/dashboard" },

      // Audit log canonical path aliases the existing performance page.
      { source: "/audit",               destination: "/performance" },
      { source: "/audit/:slug*",        destination: "/performance/:slug*" },

      // Inbox consolidates /alerts + /notifications. Default lands on
      // alerts until the unified inbox page ships.
      { source: "/inbox",               destination: "/alerts" },
      { source: "/inbox/create",        destination: "/alerts/create" },
    ];
  },
  async redirects() {
    return [
      // Root — authed users should land on Markets; auth gate handles
      // the unauthed case in middleware.
      { source: "/",          destination: "/markets",   permanent: false },
      { source: "/dashboard", destination: "/research",  permanent: false },
    ];
  },
};

export default nextConfig;
