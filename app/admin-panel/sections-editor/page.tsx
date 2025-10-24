"use client";

import React, { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import "@/styles/tiptap.css";
import { useRouter } from "next/navigation";

export default function SectionsEditor() {
  const [auctionId, setAuctionId] = useState("374add84-56a3-4efd-a77d-752f4f7a6147");
  const [sections, setSections] = useState<
    { title: string; html: string; documents: any[] }[]
  >([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const router = useRouter();

  // Fetch sections from Supabase
  useEffect(() => {
    const fetchSections = async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("detailed_sections")
        .eq("id", auctionId)
        .single();

      if (error) console.error("Error fetching sections:", error);
      else if (data?.detailed_sections) setSections(data.detailed_sections);
    };
    fetchSections();
  }, [auctionId]);

  // ✅ TipTap editor instance with SSR fix
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false, // ✅ Fix for SSR hydration mismatch
    onUpdate: ({ editor }) => {
      if (activeSection !== null) {
        const updated = [...sections];
        updated[activeSection].html = editor.getHTML();
        setSections(updated);
      }
    },
  });

  // Load section content when activeSection changes
  useEffect(() => {
    if (activeSection !== null && editor) {
      editor.commands.setContent(sections[activeSection]?.html || "");
    }
  }, [activeSection, editor]);

  // Add a new section
  const addSection = () => {
    setSections([
      ...sections,
      { title: `Section ${sections.length + 1}`, html: "", documents: [] },
    ]);
  };

  // Handle file upload to Supabase storage
  const handleFileUpload = async (e: any, idx: number) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const filePath = `auction-docs/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("auction-docs")
        .upload(filePath, file);

      if (error) throw error;

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.path}`;
      const updated = [...sections];
      updated[idx].documents.push({ file_url: url, file_name: file.name });
      setSections(updated);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please check your storage policy or connection.");
    }
  };

  // Save all sections to Supabase
  const handleSave = async () => {
    const { error } = await supabase
      .from("auctions")
      .update({ detailed_sections: sections })
      .eq("id", auctionId);

    if (error) alert("Error saving sections");
    else alert("✅ Sections saved successfully!");
  };

  // ✅ Preview button — opens viewer page
  const handlePreview = () => {
    window.open(`/admin-panel/section-viewer?auction_id=${auctionId}`, "_blank");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 border-r p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Sections</h2>
        {sections.map((sec, idx) => (
          <div
            key={idx}
            className={`p-2 mb-2 rounded cursor-pointer ${
              activeSection === idx ? "bg-blue-200" : "bg-white"
            }`}
            onClick={() => setActiveSection(idx)}
          >
            <input
              className="w-full bg-transparent outline-none font-medium"
              value={sec.title}
              onChange={(e) => {
                const updated = [...sections];
                updated[idx].title = e.target.value;
                setSections(updated);
              }}
            />
          </div>
        ))}
        <Button onClick={addSection} className="w-full mt-2">
          + Add Section
        </Button>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleSave} className="w-full bg-green-600">
            💾 Save All
          </Button>
          <Button onClick={handlePreview} className="w-full bg-blue-600">
            👁 Preview in Viewer
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex justify-between items-center bg-white">
          <h2 className="text-lg font-semibold">
            {activeSection !== null ? sections[activeSection].title : "Select a Section"}
          </h2>
          {activeSection !== null && (
            <input
              type="file"
              onChange={(e) => handleFileUpload(e, activeSection)}
              className="text-sm"
            />
          )}
        </div>

        {/* Toolbar */}
        {activeSection !== null && editor && (
          <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-b">
            <Button size="sm" onClick={() => editor.chain().focus().toggleBold().run()}>
              Bold
            </Button>
            <Button size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}>
              Italic
            </Button>
            <Button size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()}>
              Bullets
            </Button>
            <Button size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              Numbered
            </Button>
            <Button size="sm" onClick={() => editor.chain().focus().undo().run()}>
              Undo
            </Button>
            <Button size="sm" onClick={() => editor.chain().focus().redo().run()}>
              Redo
            </Button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeSection !== null ? (
            <EditorContent
              editor={editor}
              className="prose max-w-none border p-4 bg-white rounded"
            />
          ) : (
            <p className="text-gray-500">Select or add a section to begin editing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
