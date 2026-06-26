import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/context";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wear Impressive — Premium Denim Cargos & Cotton Tees",
  description: "Bangladesh's trusted fashion brand for premium denim cargos and rib-cotton tees.",
};

// Blocking script injected into <head> before React hydrates.
// Reads the cached theme overrides from localStorage and applies the same
// CSS rules that StoreThemeProvider would apply — but SYNCHRONOUSLY,
// so the browser never paints bg-black before the brand colour kicks in.
// Falls back to WI's known primary (#2596be) so even the very first visit
// gets the right colour while the API call is still in flight.
function themeInitScript() {
  return `(function(){
  try {
    var raw = localStorage.getItem('etommerce-theme-overrides');
    var ov = raw ? JSON.parse(raw) : {};
    var p = (ov && ov.primaryColor) || '#2596be';
    var a = (ov && ov.accentColor)  || p;
    var el = document.documentElement;
    el.style.setProperty('--theme-primary', p);
    if (ov && ov.accentColor) el.style.setProperty('--theme-accent', ov.accentColor);
    if (ov && ov.bgColor)     el.style.setProperty('--theme-bg',    ov.bgColor);
    if (ov && ov.textColor)   el.style.setProperty('--theme-text',  ov.textColor);
    var css =
      '.store-themed .bg-black,.store-themed .bg-gray-900,.store-themed .bg-rose-700,' +
      '.store-themed .bg-rose-800,.store-themed .bg-blue-600,.store-themed .bg-red-600,' +
      '.store-themed .bg-pink-600,.store-themed .bg-orange-500,.store-themed .bg-amber-500,' +
      '.store-themed .bg-green-600,.store-themed .bg-emerald-600,.store-themed .bg-violet-600,' +
      '.store-themed .bg-indigo-600,.store-themed .hover\\\\:bg-gray-800:hover,' +
      '.store-themed .hover\\\\:bg-rose-800:hover{background-color:' + p + ' !important}' +
      '.store-themed .text-rose-700,.store-themed .text-rose-800,.store-themed .text-blue-600,' +
      '.store-themed .text-red-600,.store-themed .text-green-600,.store-themed .text-orange-500,' +
      '.store-themed .text-violet-600,.store-themed .text-indigo-600{color:' + p + ' !important}' +
      '.store-themed .border-rose-700,.store-themed .border-rose-800,.store-themed .border-blue-600,' +
      '.store-themed .border-red-600,.store-themed .border-green-600,' +
      '.store-themed .border-orange-500{border-color:' + p + ' !important}' +
      '.store-themed .accent-bg-swap{background-color:' + a + ' !important}' +
      '.store-themed .accent-text-swap{color:' + a + ' !important}';
    var s = document.createElement('style');
    s.id = 'etommerce-theme-overrides';
    s.textContent = css;
    document.head.appendChild(s);
  } catch(e){}
})();`;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className={`${poppins.variable} antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
