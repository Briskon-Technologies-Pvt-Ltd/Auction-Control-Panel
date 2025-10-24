"use client";

import React, { useEffect, useState, use } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Layers, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/* ---------------------- helpers ---------------------- */
const genId = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function parseBatchAttributes(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: any[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    const name = parts[0];
    const type = (parts[1] || "text");
    const options = parts[2]
      ? parts[2].split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    out.push({ id: genId("att"), name, type, required: false, options });
  }
  return out;
}

/* ---------------------- types ---------------------- */
type Attribute = {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "boolean" | "date";
  required?: boolean;
  options?: string[] | null;
};

type Subcategory = {
  handle: string;
  title: string;
  short_desc?: string | null;
  is_active?: boolean;
  attributes?: Attribute[];
};

type Category = {
  id?: string;
  handle: string;
  title: string;
  short_desc?: string | null;
  long_desc?: string | null;
  image_url?: string | null;
  taxonomy?: Subcategory[];
  is_active?: boolean;
};

/* ---------------------- ConfirmDialog ---------------------- */
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="text-gray-600">{message}</div>
        <DialogFooter className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------- TagInput for Select Options ---------------------- */
function TagInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  return (
    <div className="border rounded-md p-2 flex flex-wrap gap-2 items-center">
      {values.map((tag) => (
        <div
          key={tag}
          className="flex items-center gap-1 bg-sky-100 text-sky-800 px-2 py-1 rounded-full text-sm"
        >
          {tag}
          <button
            type="button"
            className="ml-1 text-sky-600 hover:text-red-500"
            onClick={() => removeTag(tag)}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        placeholder="Add option and press Enter"
        className="flex-1 border-none outline-none text-sm bg-transparent min-w-[150px]"
      />
    </div>
  );
}

/* ---------------------- Main Page ---------------------- */
export default function SubcategoryPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [attrBatchFor, setAttrBatchFor] = useState<string | null>(null);
  const [attrText, setAttrText] = useState("");
  const [confirmData, setConfirmData] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ open: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    fetchCategory();
  }, [handle]);

  async function fetchCategory() {
    setLoading(true);
    try {
      const res = await fetch(`/api/category?handle=${handle}`);
      const json = await res.json();
      if (json?.success) setCategory(json.data?.[0] || null);
      else toast.error("Failed to fetch category");
    } catch (err) {
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(sub: string) {
    setExpanded((s) => ({ ...s, [sub]: !s[sub] }));
  }

  function updateSub(subHandle: string, patch: Partial<Subcategory>) {
    if (!category) return;
    const updated = (category.taxonomy || []).map((s) =>
      s.handle === subHandle ? { ...s, ...patch } : s
    );
    setCategory({ ...category, taxonomy: updated });
  }

  function addSub() {
    if (!category) return;
    const newSub: Subcategory = {
      handle: `sub-${Date.now()}`,
      title: "New subcategory",
      is_active: true,
      attributes: [],
    };
    setCategory({
      ...category,
      taxonomy: [...(category.taxonomy || []), newSub],
    });
    setExpanded((e) => ({ ...e, [newSub.handle]: true }));
  }

  function confirmDeleteSub(sub: Subcategory) {
    setConfirmData({
      open: true,
      title: "Delete Subcategory",
      message: `Are you sure you want to delete “${sub.title}”?`,
      onConfirm: () => deleteSub(sub.handle),
    });
  }

  function deleteSub(subHandle: string) {
    if (!category) return;
    const updated = (category.taxonomy || []).filter(
      (s) => s.handle !== subHandle
    );
    setCategory({ ...category, taxonomy: updated });
    setConfirmData({ ...confirmData, open: false });
  }

  function confirmDeleteAttr(subHandle: string, attr: Attribute) {
    setConfirmData({
      open: true,
      title: "Delete Attribute",
      message: `Delete attribute “${attr.name}”?`,
      onConfirm: () => deleteAttr(subHandle, attr.id),
    });
  }

  function deleteAttr(subHandle: string, attrId: string) {
    if (!category) return;
    const updated = (category.taxonomy || []).map((s) =>
      s.handle === subHandle
        ? { ...s, attributes: (s.attributes || []).filter((a) => a.id !== attrId) }
        : s
    );
    setCategory({ ...category, taxonomy: updated });
    setConfirmData({ ...confirmData, open: false });
  }

  async function saveCategory() {
    if (!category) return;
    setLoading(true);
    try {
      const res = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      const json = await res.json();
      if (!json.success) toast.error("Save failed");
      else toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <Button variant="outline" onClick={() => router.back()}>
              ← Back
            </Button>
            <h1 className="text-2xl font-extrabold">
              Category: {category?.title || handle}
            </h1>
          </div>
          <Button onClick={saveCategory}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Add subcategory */}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={addSub}>
            <Plus className="w-4 h-4 mr-2" /> Add Subcategory
          </Button>
        </div>

        {/* Subcategories */}
        <div className="space-y-4">
          {(category?.taxonomy || []).map((sc) => (
            <Card key={sc.handle} className="p-3">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers className="text-gray-400 w-5 h-5" />
                    <Input
                      value={sc.title}
                      onChange={(e) =>
                        updateSub(sc.handle, { title: e.target.value })
                      }
                    />
                    <div className="text-xs text-gray-400">{sc.handle}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!sc.is_active}
                      onCheckedChange={(v) => updateSub(sc.handle, { is_active: v })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(sc.handle)}
                    >
                      {expanded[sc.handle] ? "Collapse" : "Attributes"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDeleteSub(sc)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Short description"
                  value={sc.short_desc || ""}
                  onChange={(e) =>
                    updateSub(sc.handle, { short_desc: e.target.value })
                  }
                />
                {expanded[sc.handle] && (
                  <div className="mt-4 border-t pt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">Attributes</div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAttrBatchFor(sc.handle)}
                        >
                          Batch Add
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateSub(sc.handle, {
                              attributes: [
                                ...(sc.attributes || []),
                                {
                                  id: genId("att"),
                                  name: "New Attribute",
                                  type: "text",
                                },
                              ],
                            })
                          }
                        >
                          + Add
                        </Button>
                      </div>
                    </div>

                    {(sc.attributes || []).map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col gap-2 border rounded p-2"
                      >
                        <div className="flex gap-2 items-center">
                          <Input
                            value={a.name}
                            onChange={(e) => {
                              const updated = (sc.attributes || []).map((x) =>
                                x.id === a.id
                                  ? { ...x, name: e.target.value }
                                  : x
                              );
                              updateSub(sc.handle, { attributes: updated });
                            }}
                          />
                          <select
                            value={a.type}
                            onChange={(e) => {
                              const updated = (sc.attributes || []).map((x) =>
                                x.id === a.id
                                  ? { ...x, type: e.target.value as any }
                                  : x
                              );
                              updateSub(sc.handle, { attributes: updated });
                            }}
                            className="border rounded px-2 py-1"
                          >
                            <option value="text">text</option>
                            <option value="number">number</option>
                            <option value="select">select</option>
                            <option value="boolean">boolean</option>
                            <option value="date">date</option>
                          </select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => confirmDeleteAttr(sc.handle, a)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>

                        {/* Tag input for select type */}
                        {a.type === "select" && (
                          <TagInput
                            values={a.options || []}
                            onChange={(opts) => {
                              const updated = (sc.attributes || []).map((x) =>
                                x.id === a.id ? { ...x, options: opts } : x
                              );
                              updateSub(sc.handle, { attributes: updated });
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmData.open}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={() => confirmData.onConfirm && confirmData.onConfirm()}
        onCancel={() => setConfirmData({ ...confirmData, open: false })}
      />

      {/* Batch attributes dialog */}
      {attrBatchFor && (
        <Dialog open={!!attrBatchFor} onOpenChange={() => setAttrBatchFor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Batch Add Attributes</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-gray-600 mb-2">
              Format: <code>Name|type|opt1,opt2</code> (one per line)
            </div>
            <textarea
              className="w-full h-32 border rounded p-2"
              value={attrText}
              onChange={(e) => setAttrText(e.target.value)}
            />
            <DialogFooter className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAttrBatchFor(null);
                  setAttrText("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const attrs = parseBatchAttributes(attrText);
                  const sub = category?.taxonomy?.find(
                    (s) => s.handle === attrBatchFor
                  );
                  if (sub)
                    updateSub(attrBatchFor, {
                      attributes: [...(sub.attributes || []), ...attrs],
                    });
                  toast.success(`Added ${attrs.length} attributes`);
                  setAttrBatchFor(null);
                  setAttrText("");
                }}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
