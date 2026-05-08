import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { ThemeProvider } from "@/context/theme";
import { I18nProvider } from "@/context/i18n";
import ClientWrapper from "@/components/dashboard/ClientWrapper";
import MaintenanceBanner from "@/components/dashboard/MaintenanceBanner"; 
import FloatingChatOverlay from "@/components/chatbot/FloatingChatOverlay";
import { Geist, League_Spartan, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-league",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "BarangAI",
  description: "Empowering Barangays one click at a time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(geist.variable, leagueSpartan.variable, manrope.variable)}>
      <body className="bg-background text-foreground min-h-screen relative flex flex-col">
        {/* <MaintenanceBanner /> */}
        <AuthProvider>
          <I18nProvider>
            <ThemeProvider>
              <ClientWrapper>
                <main className="flex-1 w-full">
                  {children}
                </main>
                <FloatingChatOverlay />
              </ClientWrapper>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}