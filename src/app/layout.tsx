import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Backdrop from "@/components/Backdrop";
import Decorative from "@/components/Decorative";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Live holdings, sector performance and return dispersion",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full">
        <Decorative>
          <Backdrop />
        </Decorative>
        {children}
      </body>
    </html>
  );
}
