import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevPilot Copilot - AI Sales Performance Platform",
  description: "AI-powered sales enablement platform with commission tracking, roleplay practice, and real-time call coaching",
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
