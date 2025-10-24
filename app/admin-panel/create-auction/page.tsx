"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { Info, Gavel, Settings2, Image as ImageIcon, FileText } from "lucide-react";


/* ------------------ Validation Schema ------------------ */
const formSchema = z.object({
  productName: z.string().min(2, "Product name is required"),
  productDescription: z.string().optional(),
  categoryId: z.string().uuid({ message: "Please select a category" }),
  subcategoryid: z.string().min(1, "Select a subcategory"),
  auctionSubType: z.enum(["english", "silent"]),
  startPrice: z.coerce.number().positive("Enter a valid start price"),
  minimumIncrement: z.coerce.number().nonnegative(),
  launchType: z.enum(["immediate", "scheduled"]),
  scheduledStart: z.string().optional(),
  days: z.coerce.number().min(0),
  hours: z.coerce.number().min(0).max(23),
  minutes: z.coerce.number().min(0).max(59),
  product_heromsg: z.string().optional(),
  remarks: z.string().optional(),
  is_featured: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Category = {
  id: string;
  title: string;
  taxonomy: any;
};

/* ------------------ Upload Helper ------------------ */
async function uploadFiles(files: FileList | null, folder: "images" | "documents") {
  if (!files || files.length === 0) return [];
  const uploaded: string[] = []; // <-- now stores URLs only

  for (const file of Array.from(files)) {
    const ext = file.name.split(".").pop() ?? "";
    const path = `public/${folder}/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from("auctions").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${file.name}`);
      continue;
    }
    const { data } = supabase.storage.from("auctions").getPublicUrl(path);
    uploaded.push(data.publicUrl); // <-- only push the URL
  }

  return uploaded; // returns string[]
}

/* ------------------ Component ------------------ */
export default function CreateAuctionPage() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [docNames, setDocNames] = useState<string[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, any>>({});
  const [attributes, setAttributes] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auctionSubType: "english",
      launchType: "immediate",
      days: 0,
      hours: 0,
      minutes: 0,
      is_featured: false,
    },
  });

  const categoryId = watch("categoryId");
  const subcategoryid = watch("subcategoryid");
  const launchType = watch("launchType");

  /* ------------------ Fetch categories ------------------ */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, title, taxonomy")
        .eq("is_active", true)
        .order("title");

      if (error) {
        console.error(error);
        toast.error("Failed to load categories");
      } else setCategories(data || []);
    })();
  }, []);

  /* ------------------ Subcategories ------------------ */
  useEffect(() => {
    if (!categoryId) return setSubcategories([]);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat && Array.isArray(cat.taxonomy)) {
      setSubcategories(cat.taxonomy);
    } else setSubcategories([]);
  }, [categoryId, categories]);

  /* ------------------ Attributes ------------------ */
  useEffect(() => {
    if (!subcategoryid) return setAttributes([]);
    const sub = subcategories.find((s) => s.handle === subcategoryid);
    if (sub?.attributes) setAttributes(sub.attributes);
    else setAttributes([]);
  }, [subcategoryid, subcategories]);

  /* ------------------ Handlers ------------------ */
  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const previews = Array.from(files).map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const onDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map((f) => f.name);
    setDocNames(names);
  };

  const handleAttrChange = (id: string, value: any) => {
    setAttrValues((prev) => ({ ...prev, [id]: value }));
  };

  /* ------------------ Submit ------------------ */
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const imgInput = document.getElementById("productImages") as HTMLInputElement;
      const docInput = document.getElementById("productDocs") as HTMLInputElement;
      const imgs = await uploadFiles(imgInput?.files, "images");
      const docs = await uploadFiles(docInput?.files, "documents");

      const payload = {
        ...values,
        categoryId: values.categoryId,
        subcategoryid: values.subcategoryid,
        attributes: attrValues,
        productImages: imgs,
        productDocuments: docs,
        startPrice: Number(values.startPrice),
        minimumIncrement: Number(values.minimumIncrement),
        is_featured: values.is_featured,
      };

      const res = await fetch("/api/create-auction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer jwt_admin-1",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Auction created successfully!");
        reset();
        setImagePreviews([]);
        setDocNames([]);
        setAttrValues({});
      } else toast.error(result.error || "Failed to create auction");
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ UI ------------------ */

  return (
    <AdminLayout>
      <Toaster position="top-right" /> 
      <div className="max-w-6xl py-1">
        <p className="text-xs font-semibold text-gray-500 tracking-wide mb-6 uppercase">
          Create Forward Auction
        </p>
  
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
  
          {/* =========================
               PRODUCT INFORMATION
          ========================== */}
          <section className="border border-blue-300/60 rounded p-4 bg-white">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-6">
              <Info className="w-5 h-5 text-blue-500" />
              Product Information
            </h2>
  
            {/* Product Core Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <textarea
                  {...register("productName")}
                  rows={2}
                  placeholder="Enter product name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                {errors.productName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.productName.message}
                  </p>
                )}
              </div>
  
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product Description
                </label>
                <textarea
                  {...register("productDescription")}
                  rows={2}
                  placeholder="Write a short description..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
  
            {/* Marketing Note + Remarks */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product Marketing Note
                </label>
                <textarea
                  {...register("product_heromsg")}
                  rows={2}
                  placeholder="Add a highlight or tagline..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
  
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Remarks for Bidders
                </label>
                <textarea
                  {...register("remarks")}
                  rows={2}
                  placeholder="Add any special notes for bidders..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
  
            {/* Category and Subcategory */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Category *
                </label>
                <select
                  {...register("categoryId")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
  
              {subcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Subcategory *
                  </label>
                  <select
                    {...register("subcategoryid")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    <option value="">Select subcategory</option>
                    {subcategories.map((sub, idx) => (
                      <option key={idx} value={sub.handle}>
                        {sub.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
  
            {/* Product Media and Documents (Side by Side) */}
            <div className="grid md:grid-cols-2 gap-12 mt-8">
              {/* Product Images */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  Product Images
                </h3>
                <input
                  id="productImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onImageChange}
                  className="block text-xs text-gray-600"
                />
                <div className="flex flex-wrap gap-3 mt-3">
                  {imagePreviews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="preview"
                      className="w-20 h-20 rounded-md object-cover border border-gray-200"
                    />
                  ))}
                </div>
              </div>
  
              {/* Product Documents */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Product Documents
                </h3>
                <input
                  id="productDocs"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={onDocChange}
                  className="block text-xs text-gray-600"
                />
                <ul className="mt-3 text-xs text-gray-700 space-y-1">
                  {docNames.map((n, i) => (
                    <li key={i}>📄 {n}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
  
          {/* =========================
               AUCTION INFORMATION
          ========================== */}
          <section className="border border-blue-300/60 rounded p-4 bg-white">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-6">
              <Gavel className="w-5 h-5 text-green-600" />
              Auction Information
            </h2>
  
            <div className="grid md:grid-cols-2 gap-12">
              {/* Auction Details */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Auction Subtype / Format
                </label>
                <select
                  {...register("auctionSubType")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none"
                >
                  <option value="english">English</option>
                  <option value="silent">Silent</option>
                </select>
  
                <div className="mt-6 grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Bid Price (€)
                    </label>
                    <input
                      type="number"
                      {...register("startPrice")}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none"
                    />
                  </div>
  
                  {watch("auctionSubType") === "english" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Minimum Bid Increment (€)
                      </label>
                      <input
                        type="number"
                        {...register("minimumIncrement")}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
  
              {/* Launch Settings */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Launch Type
                </label>
                <select
                  {...register("launchType")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none"
                >
                  <option value="immediate">Immediate</option>
                  <option value="scheduled">Scheduled</option>
                </select>
  
                {launchType === "scheduled" && (
                  <div className="mt-6">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Scheduled Start
                    </label>
                    <input
                      type="datetime-local"
                      {...register("scheduledStart")}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none"
                    />
                  </div>
                )}
  
                <div className="mt-6">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Auction Duration
                  </label>
                  <div className="flex gap-4">
                    {["days", "hours", "minutes"].map((unit) => (
                      <div key={unit} className="flex flex-col items-center">
                        <label className="text-[11px] text-gray-600 capitalize">
                          {unit}
                        </label>
                        <input
                          type="number"
                          {...register(unit)}
                          className="border border-gray-200 bg-gray-50 rounded-md text-center w-14 p-1.5 text-xs focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
  
                <div className="mt-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("is_featured")}
                    className="w-4 h-4 accent-green-600"
                  />
                  <label className="text-xs text-gray-700">
                  <b>  Make this auction featured </b>
                  </label>
                </div>
              </div>
            </div>
          </section>
  
          {/* =========================
               SUBMIT BUTTON
          ========================== */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-md font-semibold tracking-wide transition-all disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create Auction"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
  
  
}
