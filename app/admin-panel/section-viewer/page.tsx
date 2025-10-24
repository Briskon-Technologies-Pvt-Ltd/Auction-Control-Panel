"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SectionViewer() {
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [sections, setSections] = useState<
    { title: string; html: string; documents: { file_url: string; file_name: string }[] }[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Extract auction_id from query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("auction_id");
      setAuctionId(id);
    }
  }, []);

  // ✅ Fetch detailed sections from Supabase
  useEffect(() => {
    const fetchSections = async () => {
      if (!auctionId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("auctions")
        .select("detailed_sections")
        .eq("id", auctionId)
        .single();

      if (error) {
        console.error("Error fetching sections:", error);
      } else if (data?.detailed_sections) {
        setSections(data.detailed_sections);
      }

      setLoading(false);
    };

    fetchSections();
  }, [auctionId]);

  const activeSection = sections[activeIndex] || null;

  // Loading state
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading sections...
      </div>
    );

  // No sections
  if (!sections || sections.length === 0)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        No sections found for this auction.
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-1/4 border-r bg-white p-4 overflow-y-auto shadow-sm">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Sections</h2>
        <ul className="space-y-1">
          {sections.map((sec, idx) => (
            <li key={idx}>
              <button
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 ${
                  idx === activeIndex
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {sec.title || `Section ${idx + 1}`}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto bg-white shadow-md rounded-xl p-8 border border-gray-100">
          <h1 className="text-2xl font-semibold mb-6 text-gray-800">
            {activeSection.title}
          </h1>

          {/* ✅ Proper TipTap content rendering */}
          <div
            className="prose max-w-none text-gray-800 tiptap-view"
            dangerouslySetInnerHTML={{ __html: activeSection.html }}
          />

          {/* 📎 Attached Documents */}
          {activeSection.documents && activeSection.documents.length > 0 && (
            <div className="mt-8 border-t pt-5">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                Attached Documents
              </h3>
              <ul className="list-disc ml-6 space-y-2">
                {activeSection.documents.map((doc, i) => (
                  <li key={i}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {doc.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* 🩶 Global Style Fixes for TipTap HTML */}
      <style jsx global>{`
        .tiptap-view ul {
          list-style-type: disc;
          margin-left: 1.5rem;
        }
        .tiptap-view ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
        }
        .tiptap-view li {
          margin-bottom: 0.4rem;
        }
        .tiptap-view strong {
          font-weight: bold;
        }
        .tiptap-view em {
          font-style: italic;
        }
        .tiptap-view h1,
        .tiptap-view h2,
        .tiptap-view h3 {
          font-weight: 600;
          color: #1f2937;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .tiptap-view p {
          margin-bottom: 0.8rem;
          line-height: 1.7;
        }
        .tiptap-view {
          columns: 1; /* 🧱 You can change this to 2 for multi-column layout */
        }
        @media (min-width: 1024px) {
          .tiptap-view {
            columns: 2;
            column-gap: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
