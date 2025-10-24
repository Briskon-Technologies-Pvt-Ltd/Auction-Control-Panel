"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { createClient } from "@supabase/supabase-js";
import { Plus, Pencil, Trash2, Search, Layers } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

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

/* ---------------------- helpers ---------------------- */
const genId = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function parseBatchAttributes(text: string): Attribute[] {
  // Accept lines: "Name" or "Name|type" or "Name|type|opt1,opt2"
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Attribute[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    const name = parts[0];
    const type = (parts[1] || "text") as Attribute["type"];
    const options = parts[2] ? parts[2].split(",").map((s) => s.trim()).filter(Boolean) : null;
    out.push({ id: genId("att"), name, type, required: false, options });
  }
  return out;
}

/* ---------------------- Page ---------------------- */
export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtered, setFiltered] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  // UI state: which subcategory indexes are expanded in editor
  const [expandedSubHandles, setExpandedSubHandles] = useState<Record<string, boolean>>({});
  // UI state: inline add-subcategory form visible and its temp data
  const [multiAddSubs, setMultiAddSubs] = useState<{ show: boolean; rows: { title: string; handle: string }[] }>({
    show: false,
    rows: [],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [categories, search, filter]);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/category");
      const json = await res.json();
      setCategories(json.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let data = [...categories];
    if (filter !== "all") {
      const isActive = filter === "active";
      data = data.filter((c) => !!c.is_active === isActive);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((c) => {
        return (
          c.title.toLowerCase().includes(q) ||
          (c.short_desc || "").toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q)
        );
      });
    }
    setFiltered(data);
  }

  function openEditor(cat?: Category) {
    setEditing(
      cat
        ? JSON.parse(JSON.stringify(cat)) // clone
        : {
            handle: `cat-${Date.now()}`,
            title: "",
            short_desc: "",
            taxonomy: [],
            is_active: true,
          }
    );
    setExpandedSubHandles({});
    setMultiAddSubs({ show: false, rows: [] });
    setEditorOpen(true);
  }

  async function uploadImage(file: File, handle: string) {
    try {
      const path = `${handle}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("category-images").upload(path, file, { upsert: true });
      if (error) {
        console.error(error);
        toast.error("Image upload failed");
        return null;
      }
      const publicUrl = supabase.storage.from("category-images").getPublicUrl(path).data.publicUrl;
      return publicUrl;
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
      return null;
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.handle || !editing.title) {
      toast.error("Both handle and title are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        console.error("save error", json);
        toast.error(json?.error?.message || json?.error || "Save failed");
      } else {
        toast.success("Category saved");
        setEditorOpen(false);
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(handle: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/category?handle=${encodeURIComponent(handle)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error || "Delete failed");
      } else {
        toast.success("Deleted");
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleSubExpanded(handle: string) {
    setExpandedSubHandles((prev) => ({ ...prev, [handle]: !prev[handle] }));
  }

  function addSubcategoryInline() {
    // show quick multi-add UI with one row
    setMultiAddSubs({ show: true, rows: [{ title: "New Subcategory", handle: `sub-${Date.now()}` }] });
  }

  function addSubRowsToEditing() {
    if (!editing) return;
    const rows = multiAddSubs.rows || [];
    const newSubs: Subcategory[] = rows.map((r) => ({ handle: r.handle || genId("sub"), title: r.title || "Untitled", is_active: true, attributes: [] }));
    setEditing({ ...editing, taxonomy: [...(editing.taxonomy || []), ...newSubs] });
    setMultiAddSubs({ show: false, rows: [] });
    // expand all newly added
    const newExp: Record<string, boolean> = {};
    newSubs.forEach((s) => (newExp[s.handle] = true));
    setExpandedSubHandles((prev) => ({ ...prev, ...newExp }));
  }

  function addSingleSub(editingState: Category) {
    const newSub: Subcategory = { handle: `sub-${Date.now()}`, title: "New Subcategory", is_active: true, attributes: [] };
    editingState.taxonomy = [...(editingState.taxonomy || []), newSub];
    setEditing({ ...editingState });
    setExpandedSubHandles((prev) => ({ ...prev, [newSub.handle]: true }));
  }

  function removeAttrFromSub(subHandle: string, attrId: string) {
    if (!editing) return;
    const updated = (editing.taxonomy || []).map((s) => {
      if (s.handle !== subHandle) return s;
      return { ...s, attributes: (s.attributes || []).filter((a) => a.id !== attrId) };
    });
    setEditing({ ...editing, taxonomy: updated });
  }

  function addAttributeToSub(subHandle: string, attr: Attribute) {
    if (!editing) return;
    const updated = (editing.taxonomy || []).map((s) => {
      if (s.handle !== subHandle) return s;
      return { ...s, attributes: [...(s.attributes || []), attr] };
    });
    setEditing({ ...editing, taxonomy: updated });
  }

  /* memoize nice UI classes for tabs to be prominent */
  const tabTriggerClass = useMemo(() => {
    return "px-4 py-2 rounded-md text-sm font-semibold border border-transparent hover:bg-slate-50";
  }, []);

  /* ---------------------- render ---------------------- */
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-extrabold">Category Management</h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
            </div>

            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => openEditor()}>
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <Card
              key={cat.handle}
              className="transition-transform duration-150 border border-blue-100 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.title} className="w-10 h-10 object-cover rounded-md" />
                  ) : (
                    <Layers className="text-gray-400 w-6 h-6" />
                  )}
                  <div>
                    <div className="font-semibold text-lg">{cat.title}</div>
                    <div className="text-xs text-gray-500">{cat.handle}</div>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="text-gray-600 mb-3">{cat.short_desc || "—"}</div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{(cat.taxonomy?.length || 0)} Subcategories</Badge>
                    {cat.is_active ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-600">Inactive</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEditor(cat)}>
                      <Pencil className="w-4 h-4 text-sky-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(cat.handle)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-10">No categories found</div>
        )}
      </div>

      {/* -------------- Editor modal -------------- */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="p-2">
              {/* prominent tabs */}
              <div className="flex gap-2 bg-white border-b pb-3 mb-4">
                <button
                  className={`${tabTriggerClass} ${true ? "bg-sky-50 border-sky-200 text-sky-700" : ""}`}
                  onClick={() => {/* UI uses sections below - emulate tab by anchor */}}
                >
                  Basic Info
                </button>
                <button className={tabTriggerClass}>Subcategories</button>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Handle</Label>
                    <Input value={editing.handle} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Short description</Label>
                  <Textarea value={editing.short_desc ?? ""} onChange={(e) => setEditing({ ...editing, short_desc: e.target.value })} />
                </div>

                <div className="flex items-center justify-between border p-3 rounded-md">
                  <Label>Active</Label>
                  <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>

                <div>
                  <Label>Image</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadImage(f, editing.handle);
                      if (url) setEditing({ ...editing, image_url: url });
                    }} />
                    {editing.image_url && <img src={editing.image_url} className="w-20 h-20 object-cover rounded-md border" />}
                  </div>
                </div>
              </div>

              {/* Subcategories section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Subcategories</Label>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => addSubcategoryInline()}>
                      + Quick Add (multi)
                    </Button>
                    <Button size="sm" onClick={() => { if (editing) addSingleSub(editing); }}>
                      + Add one
                    </Button>
                  </div>
                </div>

                {/* quick multi-add UI */}
                {multiAddSubs.show && (
                  <div className="border rounded p-3 bg-slate-50">
                    <div className="text-sm text-gray-600 mb-2">Add multiple subcategories — edit titles if needed, then click Add</div>
                    <div className="space-y-2">
                      {multiAddSubs.rows.map((r, idx) => (
                        <div key={r.handle} className="flex gap-2">
                          <Input value={r.title} onChange={(e) => {
                            const copy = { ...multiAddSubs };
                            copy.rows[idx].title = e.target.value;
                            setMultiAddSubs(copy);
                          }} />
                          <Input value={r.handle} onChange={(e) => {
                            const copy = { ...multiAddSubs };
                            copy.rows[idx].handle = e.target.value;
                            setMultiAddSubs(copy);
                          }} />
                          <Button size="icon" variant="ghost" onClick={() => {
                            const copy = { ...multiAddSubs };
                            copy.rows.splice(idx, 1);
                            setMultiAddSubs(copy);
                          }}>✕</Button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setMultiAddSubs((s) => ({ ...s, rows: [...s.rows, { title: "New Subcategory", handle: `sub-${Date.now()}` }] }))}>+ Row</Button>
                        <Button size="sm" onClick={addSubRowsToEditing}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setMultiAddSubs({ show: false, rows: [] })}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* subcategory list */}
                <div className="space-y-3">
                  {(editing.taxonomy || []).map((sc, i) => (
                    <div key={sc.handle} className="border rounded-md p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex gap-2 items-center">
                            <Input value={sc.title} onChange={(e) => {
                              const updated = [...(editing.taxonomy || [])];
                              updated[i].title = e.target.value;
                              setEditing({ ...editing, taxonomy: updated });
                            }} />
                            <div className="text-xs text-gray-500">{sc.handle}</div>
                            <div className="ml-4 flex items-center gap-2">
                              <Label className="text-xs">Active</Label>
                              <Switch checked={!!sc.is_active} onCheckedChange={(v) => {
                                const updated = [...(editing.taxonomy || [])];
                                updated[i].is_active = v;
                                setEditing({ ...editing, taxonomy: updated });
                              }} />
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-600">
                            <Input placeholder="Short description (optional)" value={sc.short_desc ?? ""} onChange={(e) => {
                              const updated = [...(editing.taxonomy || [])];
                              updated[i].short_desc = e.target.value;
                              setEditing({ ...editing, taxonomy: updated });
                            }} />
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => toggleSubExpanded(sc.handle)}>
                            {expandedSubHandles[sc.handle] ? "Collapse" : "Edit Attributes"}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => {
                            const updated = (editing.taxonomy || []).filter((x) => x.handle !== sc.handle);
                            setEditing({ ...editing, taxonomy: updated });
                          }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* expanded area for attributes */}
                      {expandedSubHandles[sc.handle] && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">Attributes</div>
                            <div className="flex items-center gap-2">
                              <AttributeBatchAdd
                                onAdd={(attrs) => {
                                  attrs.forEach((a) => addAttributeToSub(sc.handle, a));
                                }}
                              />
                              <Button size="sm" onClick={() => {
                                const newAttr: Attribute = { id: genId("att"), name: "New attribute", type: "text", required: false, options: null };
                                addAttributeToSub(sc.handle, newAttr);
                              }}>+ Add</Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {(sc.attributes || []).map((a) => (
                              <div key={a.id} className="flex items-center gap-2">
                                <Input value={a.name} onChange={(e) => {
                                  const updated = (editing.taxonomy || []).map((s) => {
                                    if (s.handle !== sc.handle) return s;
                                    return {
                                      ...s,
                                      attributes: (s.attributes || []).map((at) => at.id === a.id ? { ...at, name: e.target.value } : at)
                                    };
                                  });
                                  setEditing({ ...editing, taxonomy: updated });
                                }} />
                                <select value={a.type} onChange={(e) => {
                                  const updated = (editing.taxonomy || []).map((s) => {
                                    if (s.handle !== sc.handle) return s;
                                    return {
                                      ...s,
                                      attributes: (s.attributes || []).map((at) => at.id === a.id ? { ...at, type: e.target.value as any } : at)
                                    };
                                  });
                                  setEditing({ ...editing, taxonomy: updated });
                                }} className="border rounded px-2 py-1">
                                  <option value="text">text</option>
                                  <option value="number">number</option>
                                  <option value="select">select</option>
                                  <option value="boolean">boolean</option>
                                  <option value="date">date</option>
                                </select>

                                {a.type === "select" && (
                                  <Input value={(a.options || []).join(", ")} onChange={(e) => {
                                    const opts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                                    const updated = (editing.taxonomy || []).map((s) => {
                                      if (s.handle !== sc.handle) return s;
                                      return {
                                        ...s,
                                        attributes: (s.attributes || []).map((at) => at.id === a.id ? { ...at, options: opts } : at)
                                      };
                                    });
                                    setEditing({ ...editing, taxonomy: updated });
                                  }} placeholder="comma separated options" />
                                )}

                                <Button size="icon" variant="ghost" onClick={() => removeAttrFromSub(sc.handle, a.id)}>✕</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

/* ---------------------- AttributeBatchAdd component ---------------------- */
/**
 * Inline tiny component to paste multiple attributes at once.
 * Accepts lines like:
 *   Color
 *   Storage|select|64GB,128GB,256GB
 *   Warranty|number
 */
function AttributeBatchAdd({ onAdd }: { onAdd: (attrs: Attribute[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <div>
      <Button size="sm" variant="outline" onClick={() => setOpen((s) => !s)}>Batch add</Button>
      {open && (
        <div className="absolute z-50 mt-2 p-3 bg-white border rounded shadow w-80">
          <div className="text-xs text-gray-600 mb-2">One per line. Format: <code className="px-1 bg-gray-100 rounded">Name|type|opt1,opt2</code></div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-end gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => { setText(""); setOpen(false); }}>Cancel</Button>
            <Button size="sm" onClick={() => {
              const attrs = parseBatchAttributes(text);
              onAdd(attrs);
              setText("");
              setOpen(false);
              toast.success(`Added ${attrs.length} attributes`);
            }}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}
