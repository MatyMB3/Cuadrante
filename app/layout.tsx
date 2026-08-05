import "./globals.css";
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono"
});
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
  title: "Cuadrante \u2014 Quien juega?",
  description: "Organiza eventos deportivos entre amigos sin llenar el grupo de WhatsApp."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${mono.variable} ${inter.className} min-h-screen`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
