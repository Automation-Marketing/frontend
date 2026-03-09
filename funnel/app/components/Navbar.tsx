"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const links = [
    { label: "Dashboard", href: "/campaign" },
    { label: "Create Campaign", href: "/campaign/create" },
    { label: "⚙️ Settings", href: "/settings" },
    { label: "Need Help?", href: "#" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => router.push("/")}>
        <div className="navbar-brand-icon">▲</div>
        <span>FunnelAI</span>
      </div>

      <ul className="navbar-links">
        {links.map((link) => (
          <li key={link.href}>
            <button
              className={`navbar-link${pathname === link.href ? " active" : ""}`}
              onClick={() => {
                if (link.href !== "#") router.push(link.href);
              }}
            >
              {link.label}
            </button>
          </li>
        ))}
        <li>
          <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </li>
      </ul>
    </nav>
  );
}
