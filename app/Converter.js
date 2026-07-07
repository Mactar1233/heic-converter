"use client";

import { useCallback, useMemo, useRef, useState } from "react";

let heic2anyPromise = null;
// heic2any relies on browser APIs, so load it lazily on the client only.
function loadHeic2any() {
  if (!heic2anyPromise) {
    heic2anyPromise = import("heic2any").then((m) => m.default);
  }
  return heic2anyPromise;
}

// Fallback for files the browser can already decode (e.g. an iPhone photo that
// is really a JPEG but carries a .heic name/extension). heic2any refuses these
// with "image is already browser readable", so we re-encode to PNG on a canvas.
async function browserDecodeToPng(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  if (typeof bitmap.close === "function") bitmap.close();
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      "image/png"
    )
  );
}

function isHeic(file) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function pngName(fileName) {
  return fileName.replace(/\.(heic|heif)$/i, "") + ".png";
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

let uid = 0;

export default function Converter() {
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const inputRef = useRef(null);

  const convertOne = useCallback(async (id, file) => {
    try {
      let blob;
      try {
        const heic2any = await loadHeic2any();
        const result = await heic2any({
          blob: file,
          toType: "image/png",
          quality: 1,
        });
        blob = Array.isArray(result) ? result[0] : result;
      } catch (heicErr) {
        // heic2any throws "already browser readable" when the file isn't true
        // HEIC (often a JPEG in disguise). Fall back to decoding it directly.
        blob = await browserDecodeToPng(file);
      }
      const url = URL.createObjectURL(blob);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "done",
                url,
                blob,
                outName: pngName(file.name),
                outSize: blob.size,
              }
            : it
        )
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "error",
                error: (err && err.message) || "Conversion failed",
              }
            : it
        )
      );
    }
  }, []);

  const addFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      const newItems = files.map((file) => ({
        id: ++uid,
        file,
        name: file.name,
        inSize: file.size,
        status: isHeic(file) ? "converting" : "skipped",
        url: null,
        blob: null,
        outName: null,
        outSize: null,
        error: isHeic(file) ? null : "Not a HEIC/HEIF file",
      }));

      setItems((prev) => [...prev, ...newItems]);
      newItems.forEach((it) => {
        if (it.status === "converting") convertOne(it.id, it.file);
      });
    },
    [convertOne]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const onPick = useCallback(
    (e) => {
      if (e.target.files?.length) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  const done = useMemo(
    () => items.filter((it) => it.status === "done" && it.blob),
    [items]
  );
  const converting = items.some((it) => it.status === "converting");

  // The prominent "download the final version" action.
  const downloadFinal = useCallback(async () => {
    if (done.length === 0) return;

    // Single file → download the PNG directly.
    if (done.length === 1) {
      const it = done[0];
      const a = document.createElement("a");
      a.href = it.url;
      a.download = it.outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // Multiple files → bundle into one ZIP.
    try {
      setZipping(true);
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = {};
      done.forEach((it) => {
        let name = it.outName;
        if (used[name]) name = `${name.replace(/\.png$/i, "")}-${used[name]}.png`;
        used[it.outName] = (used[it.outName] || 0) + 1;
        zip.file(name, it.blob);
      });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted-png.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setZipping(false);
    }
  }, [done]);

  const clearAll = useCallback(() => {
    items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
    setItems([]);
  }, [items]);

  const finalLabel = zipping
    ? "Zipping…"
    : done.length <= 1
    ? "Download PNG"
    : `Download all (${done.length}) as ZIP`;

  return (
    <>
      <div
        className={"dropzone" + (dragging ? " dragging" : "")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="dz-icon">📸</div>
        <div className="dz-title">
          {dragging ? "Drop to convert" : "Drag & drop HEIC files here"}
        </div>
        <div className="dz-sub">
          or <span className="dz-browse">browse your files</span> · .heic & .heif
          · multiple at once
        </div>
        <input
          ref={inputRef}
          className="hidden-input"
          type="file"
          accept=".heic,.heif,image/heic,image/heif"
          multiple
          onChange={onPick}
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="actionbar">
            <div className="stat">
              <span className="num">{done.length}</span>
              <span className="label">
                of {items.length} ready
                {converting ? " · converting…" : ""}
              </span>
            </div>
            <div className="spacer" />
            <div className="btns">
              <button className="btn ghost" onClick={clearAll}>
                Clear
              </button>
              <button
                className="btn primary"
                onClick={downloadFinal}
                disabled={done.length === 0 || zipping}
              >
                {!zipping && <DownloadIcon />}
                {finalLabel}
              </button>
            </div>
          </div>

          <div className="grid">
            {items.map((it) => (
              <div className="card" key={it.id}>
                <div className="thumb">
                  {it.status === "done" && (
                    <span className="badge done">PNG</span>
                  )}
                  {it.status === "converting" && (
                    <span className="badge busy">Working</span>
                  )}
                  {(it.status === "error" || it.status === "skipped") && (
                    <span className="badge bad">Skipped</span>
                  )}

                  {it.status === "done" && it.url ? (
                    <img src={it.url} alt={it.outName} />
                  ) : it.status === "converting" ? (
                    <div className="ph">
                      <span className="spinner" />
                      <span>converting…</span>
                    </div>
                  ) : (
                    <div className="ph">
                      <span className="emoji">⚠️</span>
                      <span>can’t convert</span>
                    </div>
                  )}
                </div>

                <div className="meta">
                  <div className="name">{it.outName || it.name}</div>
                  {it.status === "done" ? (
                    <div className="subline">
                      PNG · {formatBytes(it.outSize)}
                    </div>
                  ) : it.status === "converting" ? (
                    <div className="subline">Reading HEIC…</div>
                  ) : (
                    <div className="subline bad">{it.error || "Failed"}</div>
                  )}

                  {it.status === "done" && it.url && (
                    <a className="dl" href={it.url} download={it.outName}>
                      <DownloadIcon />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
