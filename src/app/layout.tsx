import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus Core - Dashboard Clínico",
  description: "Motor Clínico e Orquestrador Cibernético de Carga de Treinamento. Sistema completo para monitoramento de atletas.",
  keywords: ["Nexus Core", "Dashboard Clínico", "Treinamento", "ACWR", "INOL", "Biomarcadores", "Monitoramento de Atletas"],
  authors: [{ name: "Nexus Core Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Nexus Core - Dashboard Clínico",
    description: "Sistema completo de monitoramento clínico e carga de treinamento",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Core - Dashboard Clínico",
    description: "Sistema completo de monitoramento clínico e carga de treinamento",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
