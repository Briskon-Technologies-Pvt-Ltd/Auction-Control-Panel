"use client";

import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function ClientQuill({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    // initialize only once on client
    if (!editorRef.current) return;
    if (quillRef.current) return;

    // create Quill on the target div
    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "clean"],
        ],
      },
    });

    // set initial content (if any)
    if (value) {
      quillRef.current.root.innerHTML = value;
    }

    // listen for changes and proxy HTML to parent
    quillRef.current.on("text-change", () => {
      const html = quillRef.current?.root.innerHTML ?? "";
      onChange(html === "<p><br></p>" ? "" : html);
    });

    return () => {
      // cleanup quill instance
      if (quillRef.current) {
        quillRef.current.off("text-change" as any);
        // Quill doesn't provide a destroy method — remove DOM node refs
        // remove editor contents to allow GC
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (quillRef.current as any) = null;
      }
    };
    // we intentionally want this to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent changes value (e.g., loading saved sections)
  useEffect(() => {
    if (!quillRef.current) return;
    const current = quillRef.current.root.innerHTML;
    if (value !== current) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div>
      {/* wrapper for styling if needed */}
      <div className="border rounded" style={{ minHeight: 150 }}>
        <div ref={editorRef} />
      </div>
    </div>
  );
}
