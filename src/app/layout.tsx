import type { Metadata } from "next";
import "./globals.css";
import "./accessibility.css";
import "./storefront-containment.css";

export const metadata: Metadata = {
  title: "L'Mere Studio - Simulador de Encomendas para Confeitarias",
  description: "Sistema de simulação de encomendas e agendamento para confeiteiras e ateliês. Monte seu bolo personalizado com facilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
