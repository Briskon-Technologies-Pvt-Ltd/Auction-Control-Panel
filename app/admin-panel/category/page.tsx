"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/* ---------------------- helpers ---------------------- */
async function uploadImage(file: File, handle: string) {
  try {
    const path = `${handle}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("category-images")
      .upload(path, file, { upsert: true });
    if (error) {
      console.error(error);
      toast.error("Image upload failed");
      return null;
    }
    const publicUrl = supabase.storage
      .from("category-images")
      .getPublicUrl(path).data.publicUrl;
    return publicUrl;
  } catch (err) {
    console.error(err);
    toast.error("Image upload failed");
    return null;
  }
}

/* ---------------------- types ---------------------- */
type Subcategory = {
  handle: string;
  title: string;
  short_desc?: string | null;
  is_active?: boolean;
  attributes?: any[];
};

type Category = {
  id?: string;
  handle: string;
  title: string;
  short_desc?: string | null;
  image_url?: string | null;
  taxonomy?: Subcategory[];
  is_active?: boolean;
};

/* ---------------------- confirm dialog ---------------------- */
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

/* ---------------------- main ---------------------- */
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtered, setFiltered] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [showAdd, setShowAdd] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newCat, setNewCat] = useState<Partial<Category>>({
    handle: `cat-${Date.now()}`,
    title: "",
    is_active: true,
  });

  const [confirmData, setConfirmData] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ open: false, title: "", message: "", onConfirm: null });

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
      if (json?.success) {
        setCategories(json.data || []);
      } else {
        toast.error("Failed to load categories");
      }
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
          (c.title || "").toLowerCase().includes(q) ||
          (c.handle || "").toLowerCase().includes(q)
        );
      });
    }
    setFiltered(data);
  }

  async function saveCategory(cat: Category) {
    setLoading(true);
    try {
      const res = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cat),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error || "Save failed");
      } else {
        toast.success(isEditMode ? "Category updated" : "Category saved");
        fetchCategories();
      }
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(handle: string, title: string) {
    setConfirmData({
      open: true,
      title: "Delete Category",
      message: `Are you sure you want to permanently delete the category “${title}”? This action cannot be undone.`,
      onConfirm: () => deleteCategory(handle),
    });
  }

  async function deleteCategory(handle: string) {
    setConfirmData({ ...confirmData, open: false });
    setLoading(true);
    try {
      const res = await fetch(`/api/category?handle=${handle}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error || "Delete failed");
      } else {
        toast.success("Category deleted");
        fetchCategories();
      }
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNew() {
    if (!newCat.handle || !newCat.title) {
      toast.error("Handle and title required");
      return;
    }
    const payload: Category = {
      handle: newCat.handle!,
      title: newCat.title!,
      short_desc: newCat.short_desc ?? null,
      image_url: newCat.image_url ?? null,
      taxonomy: [],
      is_active: newCat.is_active ?? true,
    };
    await saveCategory(payload);
    resetForm();
  }

  async function handleUpdate() {
    if (!newCat.handle || !newCat.title) {
      toast.error("Handle and title required");
      return;
    }
    await saveCategory(newCat as Category);
    resetForm();
  }

  function handleEdit(cat: Category) {
    setNewCat(cat);
    setIsEditMode(true);
    setShowAdd(true);
  }

  function resetForm() {
    setShowAdd(false);
    setIsEditMode(false);
    setNewCat({ handle: `cat-${Date.now()}`, title: "", is_active: true });
  }

  return (
    <AdminLayout>

<p className="text-sm font-bold text-gray-500 mb-4">CATEGORY & SUB CATEGORY MANAGEMENT</p> 
 
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-2 py-2"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button
              onClick={() => {
                setShowAdd((s) => !s);
                setIsEditMode(false);
                setNewCat({ handle: `cat-${Date.now()}`, title: "", is_active: true });
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAdd && (
          <div className="border rounded p-4 bg-slate-50 space-y-3">
            <h2 className="text-lg font-semibold">
              {isEditMode ? "Edit Category" : "Add New Category"}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Handle"
                value={newCat.handle}
                disabled={isEditMode}
                onChange={(e) =>
                  setNewCat((s) => ({ ...s, handle: e.target.value }))
                }
              />
              <Input
                placeholder="Title"
                value={newCat.title}
                onChange={(e) =>
                  setNewCat((s) => ({ ...s, title: e.target.value }))
                }
              />
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadImage(
                      f,
                      newCat.handle || `cat-${Date.now()}`
                    );
                    if (url) setNewCat((s) => ({ ...s, image_url: url }));
                  }}
                />
                {newCat.image_url && (
                  <img
                    src={newCat.image_url}
                    alt="Category"
                    className="mt-2 w-16 h-16 rounded-md object-cover border"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={isEditMode ? handleUpdate : handleAddNew}>
                {isEditMode ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <Card key={cat.handle} className="hover:shadow-md relative">
              {/* Subcategory Count */}
              <Badge
                variant="outline"
                className="absolute top-4 right-4 bg-slate-100 text-gray-700 text-xs"
              >
                {(cat.taxonomy?.length || 0)} Subcategories
              </Badge>

              <CardHeader>
                <CardTitle className="flex items-center justify-start gap-2">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.title}
                      className="w-10 h-10 object-cover rounded-md"
                    />
                  ) : (
                    <Layers className="text-gray-400 w-6 h-6" />
                  )}
                  <div>
                    <div className="font-semibold text-lg">{cat.title}</div>
                     </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600">{cat.short_desc || "—"}</div>

                {/* Bottom actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {/* Moved toggle just before Active/Inactive badge */}
                    <Switch
                      checked={!!cat.is_active}
                      onCheckedChange={(v) =>
                        saveCategory({ ...cat, is_active: v })
                      }
                    />
                    {cat.is_active ? (
                      <Badge className="bg-green-100 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-600">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    <Link
                      href={`/admin-panel/category/${cat.handle}/subcategories`}
                    >
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cat)}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(cat.handle, cat.title)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmData.open}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={() => confirmData.onConfirm && confirmData.onConfirm()}
        onCancel={() => setConfirmData({ ...confirmData, open: false })}
      />
    </AdminLayout>
  );
}
