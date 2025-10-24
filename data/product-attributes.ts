import type { ProductAttribute } from "@/types/auction-types"

/**
 * Predefined product attributes based on category
 */
export const CATEGORY_ATTRIBUTES: Record<string, ProductAttribute[]> = {
  // Electronics - Mobile Phones
  "electronics-mobiles": [
    {
      id: "brand",
      name: "Brand",
      value: "",
      type: "select",
      required: true,
      options: ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "LG", "Other"],
    },
    {
      id: "model",
      name: "Model",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "storage",
      name: "Storage Capacity",
      value: "",
      type: "select",
      required: true,
      options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
    },
    {
      id: "color",
      name: "Color",
      value: "",
      type: "color",
      required: false,
    },
    {
      id: "condition",
      name: "Condition",
      value: "",
      type: "select",
      required: true,
      options: ["New", "Like New", "Good", "Fair", "Poor"],
    },
    {
      id: "unlocked",
      name: "Unlocked",
      value: "",
      type: "boolean",
      required: false,
    },
  ],

  // Electronics - Laptops
  "electronics-laptops": [
    {
      id: "brand",
      name: "Brand",
      value: "",
      type: "select",
      required: true,
      options: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI", "Microsoft", "Other"],
    },
    {
      id: "processor",
      name: "Processor",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "ram",
      name: "RAM",
      value: "",
      type: "select",
      required: true,
      options: ["4GB", "8GB", "16GB", "32GB", "64GB"],
    },
    {
      id: "storage",
      name: "Storage",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "screen-size",
      name: "Screen Size",
      value: "",
      type: "select",
      required: true,
      options: ['11"', '13"', '14"', '15"', '16"', '17"'],
    },
    {
      id: "condition",
      name: "Condition",
      value: "",
      type: "select",
      required: true,
      options: ["New", "Like New", "Good", "Fair", "Poor"],
    },
  ],

  // Vehicles - Cars
  "vehicles-cars": [
    {
      id: "make",
      name: "Make",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "model",
      name: "Model",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "year",
      name: "Year",
      value: "",
      type: "number",
      required: true,
    },
    {
      id: "mileage",
      name: "Mileage",
      value: "",
      type: "number",
      required: true,
    },
    {
      id: "fuel-type",
      name: "Fuel Type",
      value: "",
      type: "select",
      required: true,
      options: ["Gasoline", "Diesel", "Electric", "Hybrid", "CNG", "LPG"],
    },
    {
      id: "transmission",
      name: "Transmission",
      value: "",
      type: "select",
      required: true,
      options: ["Manual", "Automatic", "CVT"],
    },
    {
      id: "color",
      name: "Color",
      value: "",
      type: "color",
      required: false,
    },
    {
      id: "vin",
      name: "VIN Number",
      value: "",
      type: "text",
      required: false,
    },
  ],

  // Art & Collectibles - Paintings
  "art-paintings": [
    {
      id: "artist",
      name: "Artist",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "medium",
      name: "Medium",
      value: "",
      type: "select",
      required: true,
      options: ["Oil on Canvas", "Acrylic", "Watercolor", "Pastel", "Mixed Media", "Digital", "Other"],
    },
    {
      id: "dimensions",
      name: "Dimensions (H x W)",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "year-created",
      name: "Year Created",
      value: "",
      type: "number",
      required: false,
    },
    {
      id: "signed",
      name: "Signed",
      value: "",
      type: "boolean",
      required: false,
    },
    {
      id: "provenance",
      name: "Provenance",
      value: "",
      type: "text",
      required: false,
    },
    {
      id: "condition",
      name: "Condition",
      value: "",
      type: "select",
      required: true,
      options: ["Excellent", "Very Good", "Good", "Fair", "Poor"],
    },
  ],

  // Jewelry - Rings
  "jewelry-rings": [
    {
      id: "metal-type",
      name: "Metal Type",
      value: "",
      type: "select",
      required: true,
      options: ["Gold", "Silver", "Platinum", "Titanium", "Stainless Steel", "Other"],
    },
    {
      id: "metal-purity",
      name: "Metal Purity",
      value: "",
      type: "select",
      required: false,
      options: ["10K", "14K", "18K", "22K", "24K", "925 Sterling", "950 Platinum"],
    },
    {
      id: "gemstone",
      name: "Primary Gemstone",
      value: "",
      type: "select",
      required: false,
      options: ["Diamond", "Ruby", "Sapphire", "Emerald", "Pearl", "Amethyst", "Topaz", "None", "Other"],
    },
    {
      id: "carat-weight",
      name: "Carat Weight",
      value: "",
      type: "number",
      required: false,
    },
    {
      id: "ring-size",
      name: "Ring Size",
      value: "",
      type: "text",
      required: true,
    },
    {
      id: "certification",
      name: "Certification",
      value: "",
      type: "text",
      required: false,
    },
  ],

  // Default attributes for uncategorized items
  default: [
    {
      id: "brand",
      name: "Brand",
      value: "",
      type: "text",
      required: false,
    },
    {
      id: "model",
      name: "Model",
      value: "",
      type: "text",
      required: false,
    },
    {
      id: "condition",
      name: "Condition",
      value: "",
      type: "select",
      required: true,
      options: ["New", "Like New", "Good", "Fair", "Poor"],
    },
    {
      id: "material",
      name: "Material",
      value: "",
      type: "text",
      required: false,
    },
    {
      id: "color",
      name: "Color",
      value: "",
      type: "color",
      required: false,
    },
    {
      id: "size",
      name: "Size",
      value: "",
      type: "text",
      required: false,
    },
  ],
}

/**
 * Get attributes for a specific category
 */
export const getAttributesForCategory = (categoryId: string): ProductAttribute[] => {
  return CATEGORY_ATTRIBUTES[categoryId] || CATEGORY_ATTRIBUTES["default"]
}

/**
 * Create a new custom attribute
 */
export const createCustomAttribute = (
  name: string,
  type: ProductAttribute["type"],
  required = false,
  options?: string[],
): ProductAttribute => {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    value: "",
    type,
    required,
    options,
  }
}
