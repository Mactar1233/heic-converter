import Converter from "./Converter";

export default function Home() {
  return (
    <main className="wrap">
      <div className="header">
        <span className="pill">
          <span className="dot" />
          100% private — files never leave your device
        </span>
        <h1>
          HEIC to <span className="grad">PNG</span>, instantly
        </h1>
        <p>
          Drop your iPhone <code>.heic</code> photos below to convert them to
          crisp <code>.png</code> files. Everything runs right in your browser —
          no uploads, no waiting, no limits.
        </p>
      </div>

      <Converter />

      <div className="footer">
        Runs entirely client-side · built with Next.js · deploy free on{" "}
        <a href="https://vercel.com" target="_blank" rel="noreferrer">
          Vercel
        </a>
      </div>
    </main>
  );
}
