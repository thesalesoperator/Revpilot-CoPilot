import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevPilot - Commission Calculator & Tracker",
  description: "Track your sales commissions and project your earnings with RevPilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthProvider>
          <OrganizationProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </OrganizationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
