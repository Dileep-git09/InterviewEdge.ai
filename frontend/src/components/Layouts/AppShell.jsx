import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Footer is intentionally removed from the authenticated app shell.
// It was showing irrelevant landing-page links (About, Careers, Terms…)
// to logged-in users who already know the product. The sidebar handles all
// navigation; a footer here added visual clutter with zero benefit.
const AppShell = ({ title, subtitle, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Content offset by sidebar width on desktop */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
