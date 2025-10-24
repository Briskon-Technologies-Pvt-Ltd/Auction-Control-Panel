import type { ProductCategory } from "@/types/auction-types"

/**
 * Predefined product categories for the auction platform
 * Organized in a hierarchical structure with subcategories
 */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "electronics",
    name: "Electronics",
    level: 0,
    subcategories: [
      {
        id: "electronics-mobiles",
        name: "Mobile Phones",
        parentId: "electronics",
        level: 1,
      },
      {
        id: "electronics-laptops",
        name: "Laptops & Computers",
        parentId: "electronics",
        level: 1,
      },
      {
        id: "electronics-audio",
        name: "Audio & Headphones",
        parentId: "electronics",
        level: 1,
      },
      {
        id: "electronics-cameras",
        name: "Cameras & Photography",
        parentId: "electronics",
        level: 1,
      },
      {
        id: "electronics-gaming",
        name: "Gaming Consoles",
        parentId: "electronics",
        level: 1,
      },
      {
        id: "electronics-wearables",
        name: "Wearables & Smart Devices",
        parentId: "electronics",
        level: 1,
      },
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    level: 0,
    subcategories: [
      {
        id: "vehicles-cars",
        name: "Cars",
        parentId: "vehicles",
        level: 1,
      },
      {
        id: "vehicles-motorcycles",
        name: "Motorcycles",
        parentId: "vehicles",
        level: 1,
      },
      {
        id: "vehicles-trucks",
        name: "Trucks & Commercial",
        parentId: "vehicles",
        level: 1,
      },
      {
        id: "vehicles-boats",
        name: "Boats & Marine",
        parentId: "vehicles",
        level: 1,
      },
    ],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    level: 0,
    subcategories: [
      {
        id: "real-estate-residential",
        name: "Residential",
        parentId: "real-estate",
        level: 1,
      },
      {
        id: "real-estate-commercial",
        name: "Commercial",
        parentId: "real-estate",
        level: 1,
      },
      {
        id: "real-estate-land",
        name: "Land & Plots",
        parentId: "real-estate",
        level: 1,
      },
    ],
  },
  {
    id: "art-collectibles",
    name: "Art & Collectibles",
    level: 0,
    subcategories: [
      {
        id: "art-paintings",
        name: "Paintings",
        parentId: "art-collectibles",
        level: 1,
      },
      {
        id: "art-sculptures",
        name: "Sculptures",
        parentId: "art-collectibles",
        level: 1,
      },
      {
        id: "art-antiques",
        name: "Antiques",
        parentId: "art-collectibles",
        level: 1,
      },
      {
        id: "art-coins",
        name: "Coins & Currency",
        parentId: "art-collectibles",
        level: 1,
      },
      {
        id: "art-stamps",
        name: "Stamps",
        parentId: "art-collectibles",
        level: 1,
      },
    ],
  },
  {
    id: "jewelry-watches",
    name: "Jewelry & Watches",
    level: 0,
    subcategories: [
      {
        id: "jewelry-rings",
        name: "Rings",
        parentId: "jewelry-watches",
        level: 1,
      },
      {
        id: "jewelry-necklaces",
        name: "Necklaces",
        parentId: "jewelry-watches",
        level: 1,
      },
      {
        id: "jewelry-watches-luxury",
        name: "Luxury Watches",
        parentId: "jewelry-watches",
        level: 1,
      },
      {
        id: "jewelry-earrings",
        name: "Earrings",
        parentId: "jewelry-watches",
        level: 1,
      },
    ],
  },
  {
    id: "fashion",
    name: "Fashion & Apparel",
    level: 0,
    subcategories: [
      {
        id: "fashion-clothing",
        name: "Clothing",
        parentId: "fashion",
        level: 1,
      },
      {
        id: "fashion-shoes",
        name: "Shoes",
        parentId: "fashion",
        level: 1,
      },
      {
        id: "fashion-accessories",
        name: "Accessories",
        parentId: "fashion",
        level: 1,
      },
      {
        id: "fashion-bags",
        name: "Bags & Handbags",
        parentId: "fashion",
        level: 1,
      },
    ],
  },
  {
    id: "home-garden",
    name: "Home & Garden",
    level: 0,
    subcategories: [
      {
        id: "home-furniture",
        name: "Furniture",
        parentId: "home-garden",
        level: 1,
      },
      {
        id: "home-appliances",
        name: "Home Appliances",
        parentId: "home-garden",
        level: 1,
      },
      {
        id: "home-decor",
        name: "Home Decor",
        parentId: "home-garden",
        level: 1,
      },
      {
        id: "home-garden-tools",
        name: "Garden Tools",
        parentId: "home-garden",
        level: 1,
      },
    ],
  },
  {
    id: "sports-recreation",
    name: "Sports & Recreation",
    level: 0,
    subcategories: [
      {
        id: "sports-equipment",
        name: "Sports Equipment",
        parentId: "sports-recreation",
        level: 1,
      },
      {
        id: "sports-outdoor",
        name: "Outdoor Gear",
        parentId: "sports-recreation",
        level: 1,
      },
      {
        id: "sports-fitness",
        name: "Fitness Equipment",
        parentId: "sports-recreation",
        level: 1,
      },
    ],
  },
  {
    id: "books-media",
    name: "Books & Media",
    level: 0,
    subcategories: [
      {
        id: "books-rare",
        name: "Rare Books",
        parentId: "books-media",
        level: 1,
      },
      {
        id: "books-manuscripts",
        name: "Manuscripts",
        parentId: "books-media",
        level: 1,
      },
      {
        id: "books-vinyl",
        name: "Vinyl Records",
        parentId: "books-media",
        level: 1,
      },
    ],
  },
  {
    id: "industrial",
    name: "Industrial & Equipment",
    level: 0,
    subcategories: [
      {
        id: "industrial-machinery",
        name: "Machinery",
        parentId: "industrial",
        level: 1,
      },
      {
        id: "industrial-tools",
        name: "Industrial Tools",
        parentId: "industrial",
        level: 1,
      },
      {
        id: "industrial-construction",
        name: "Construction Equipment",
        parentId: "industrial",
        level: 1,
      },
    ],
  },
]

/**
 * Get all categories as a flat array
 */
export const getAllCategories = (): ProductCategory[] => {
  const flatCategories: ProductCategory[] = []

  const addCategories = (categories: ProductCategory[]) => {
    categories.forEach((category) => {
      flatCategories.push(category)
      if (category.subcategories) {
        addCategories(category.subcategories)
      }
    })
  }

  addCategories(PRODUCT_CATEGORIES)
  return flatCategories
}

/**
 * Get subcategories for a given parent category
 */
export const getSubcategories = (parentId: string): ProductCategory[] => {
  const allCategories = getAllCategories()
  return allCategories.filter((cat) => cat.parentId === parentId)
}

/**
 * Get category by ID
 */
export const getCategoryById = (id: string): ProductCategory | undefined => {
  const allCategories = getAllCategories()
  return allCategories.find((cat) => cat.id === id)
}

/**
 * Search categories by name
 */
export const searchCategories = (query: string): ProductCategory[] => {
  const allCategories = getAllCategories()
  return allCategories.filter((cat) => cat.name.toLowerCase().includes(query.toLowerCase()))
}
