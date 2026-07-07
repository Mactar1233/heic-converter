import "./globals.css";

export const metadata = {
  title: "HEIC → PNG Converter",
  description: "Convert HEIC/HEIF images to PNG right in your browser. Fast, private, free.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
