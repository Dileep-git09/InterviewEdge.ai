import React from "react";
import AppShell from "./AppShell";

// Thin wrapper kept for backwards-compatibility: every page that already used
// <DashboardLayout> now renders inside the new AppShell (sidebar + topbar +
// footer) with no per-page changes required.
const DashboardLayout = ({ children, title, subtitle }) => {
  return (
    <AppShell title={title} subtitle={subtitle}>
      {children}
    </AppShell>
  );
};

export default DashboardLayout;
