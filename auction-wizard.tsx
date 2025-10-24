"use client";

import type React from "react";
import Select from "react-select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useRef, useEffect } from "react";
import { Inter } from "next/font/google";
import { Clock, Users, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import FileUploader from "./components/file-uploader";
import TemplateSelector from "./components/template-selector";
import QualificationCriteriaManager from "./components/qualification-criteria";
import TermsAndConditionsManager from "./components/terms-conditions";
import LotManager from "./components/lot-manager";
import LanguageSelector from "./components/language-selector";
import ApiKeySetup from "./components/api-key-setup";
import { I18nProvider, useTranslation } from "./i18n/i18n-context";
import type { AuctionFormData, AuctionTemplate, UploadedFile, Currency, Language } from "./types/auction-types";
import { createClient } from "@supabase/supabase-js";
import { useFileUpload } from "./hooks/use-file-upload"; // Adjust path as needed
// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  validateStep7, // Added for Step 7 validation
  isValidEmail,
  type ValidationError,
} from "./validation-utils";
import ProductClassification from "./components/product-classification";
import BidIncrementConfig from "./components/bid-increment-config";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { PRODUCT_CATEGORIES } from "./data/product-categories";
import { useAuth } from "@/components/auth/auth-provider";

const inter = Inter({ subsets: ["latin"] });

// Type for deletion confirmation
type DeletionType = "image" | "document" | "participant" | null;

interface DeletionInfo {
  type: DeletionType;
  index: number;
  name: string;
}

const requiredDocumentOptions = [
  { label: "Experience of Supplier", value: "Experience of Supplier" },
  { label: "Technical Proposal", value: "Technical Proposal" },
  { label: "Cost Proposal", value: "Cost Proposal" },
  { label: "Tax Compliance Certificate", value: "Tax Compliance Certificate" },
  { label: "Business License", value: "Business License" },
  { label: "Industry Certifications", value: "Industry Certifications" },
  { label: "NDA / Confidentiality Agreement", value: "NDA / Confidentiality Agreement" },
  { label: "Conflict of Interest Declaration", value: "Conflict of Interest Declaration" },
  { label: "Annual Turnover – Last 3 Years", value: "Annual Turnover – Last 3 Years" },
  { label: "Audited Financial Statements", value: "Audited Financial Statements" },
  { label: "Experience Summary", value: "Experience Summary" },
  { label: "List of Past Projects", value: "List of Past Projects" },
  { label: "Key Personnel CVs", value: "Key Personnel CVs" },
  { label: "Company Profile", value: "Company Profile" },
  { label: "Certificate of Incorporation / Registration", value: "Certificate of Incorporation / Registration" },
  { label: "Bank Reference Letter or Credit Rating Report", value: "Bank Reference Letter or Credit Rating Report" },
  { label: "Compliance with Environmental and Social Standards", value: "Compliance with Environmental and Social Standards" },
  { label: "Quality Assurance Policy / ISO Certifications", value: "Quality Assurance Policy / ISO Certifications" },
  { label: "Work Plan / Implementation Schedule", value: "Work Plan / Implementation Schedule" },
  { label: "References / Client Testimonials", value: "References / Client Testimonials" },
];
type Option = {
  label: string;
  value: string;
};

// Default form data (aligned with assumed AuctionFormData)
const defaultFormData: AuctionFormData = {
  // Step 1: Auction Type
  auctionType: "forward",
  auctionSubType: "english",

  // Step 2: Product/Lot Details (moved from step 3)
  isMultiLot: false,
  productName: "",
  productDescription: "",
  productImages: [],
  productDocuments: [],
  lots: [],
  categoryId: "",
  subCategoryId: "",
  attributes: [],
  sku: "",
  brand: "",
  model: "",

  // Step 3: Bidding Parameters (moved from step 2)
  startPrice: 0,
  minimumIncrement: 0,
  percent: null, // Added for percentage increment (e.g., 5 for 5%)
  auctionDuration: {
    days: 0,
    hours: 0,
    minutes: 0,
  },
  currency: "USD",
  launchType: "immediate",
  scheduledStart: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  bidExtension: false,
  bidExtensionTime: 5,
  allowAutoBidding: false,
  bidIncrementType: "fixed",
  bidIncrementRules: [],
  isSilentAuction: false,

  // Step 4: Participation Rules
  participationType: "public",
  participantEmails: [],
  qualificationCriteria: [],

  // Step 5: Terms & Conditions
  termsAndConditions: [],
  enableDispute: false,

  // Additional Settings
  language: "en",
  enableNotifications: true,
  notificationTypes: ["email"],
  enableAnalytics: true,

  // Step 7: Reverse Auction Details (new fields)
  targetprice: undefined, // Numeric field for reverse auctions
  requireddocuments: "[]", // Array for required documents
  productQuantity: 1, // For multi-lot auctions
};

interface AuctionWizardContentProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

function AuctionWizardContent({ language, onLanguageChange }: AuctionWizardContentProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  const [formData, setFormData] = useState<AuctionFormData>({
    ...defaultFormData,
    language: language,
  });

  const { user, isLoading, login } = useAuth();

  // API Key management
  const [apiKey, setApiKey] = useState("");
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Update formData language when prop changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, language }));
  }, [language]);

  useEffect(() => {
  setFormData((prev) => ({ ...prev, startPrice: 1, minimumIncrement: 1 }));
}, []); // Runs once on mount

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const [isLaunched, setIsLaunched] = useState(false);

  // For file uploads
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // State for deletion confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo>({
    type: null,
    index: -1,
    name: "",
  });

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);

  // AI Description Generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiGeneratedDescription, setAiGeneratedDescription] = useState("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [hasUserSeenAiSuggestion, setHasUserSeenAiSuggestion] = useState(false);

  // Refs for focusing first error field
  const startPriceRef = useRef<HTMLInputElement>(null);
  const minimumIncrementRef = useRef<HTMLInputElement>(null);
  const daysRef = useRef<HTMLInputElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);
  const productDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const participantEmailRef = useRef<HTMLInputElement>(null);
  const scheduledDateRef = useRef<HTMLInputElement>(null);
  const scheduledTimeRef = useRef<HTMLInputElement>(null);

  // File upload hooks
  const {
    uploadState: imageUploadState,
    uploadFiles: uploadImages,
    removeFile: removeImage,
    resetUploadState: resetImageUpload,
  } = useFileUpload("public");

  const {
    uploadState: documentUploadState,
    uploadFiles: uploadDocuments,
    removeFile: removeDocument,
    resetUploadState: resetDocumentUpload,
  } = useFileUpload("documents");

  // Handle API key setup
  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
    setShowApiKeySetup(false);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: Language) => {
    setFormData((prev) => ({ ...prev, language: newLanguage }));
    onLanguageChange(newLanguage);
  };

  // Handle template selection
  const handleSelectTemplate = (template: AuctionTemplate) => {
    setFormData({
      ...formData,
      auctionType: template.auctionType,
      auctionSubType: template.auctionSubType,
      auctionDuration: template.auctionDuration,
      currency: template.currency,
      participationType: template.participationType,
      qualificationCriteria: template.qualificationCriteria,
      termsAndConditions: template.termsAndConditions,
      templateId: template.id,
    });
    setShowTemplateSelector(false);
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    let stepValidation = { isValid: true, errors: [] as ValidationError[] };

    switch (currentStep) {
      case 1:
        stepValidation = validateStep1(formData.auctionType, formData.auctionSubType);
        break;
      case 2:
        // Step 2 is now Product Details
        if (formData.isMultiLot) {
          // Validate lots
          if (formData.lots.length === 0) {
            stepValidation = {
              isValid: false,
              errors: [{ field: "lots", message: "Please add at least one lot" }],
            };
          } else {
            // Check each lot for validity
            const invalidLots = formData.lots.filter(
              (lot) => !lot.name || !lot.description || lot.startPrice <= 0 || lot.minimumIncrement <= 0
            );
            if (invalidLots.length > 0) {
              stepValidation = {
                isValid: false,
                errors: [{ field: "lots", message: "Please complete all required fields for each lot" }],
              };
            }
          }
        } else {
          stepValidation = validateStep3(formData.productName, formData.productDescription,formData.auctionSubType,formData.productQuantity);
          // Also validate category selection
          if (!formData.categoryId) {
            stepValidation.errors.push({
              field: "categoryId",
              message: "Please select a product category",
            });
            stepValidation.isValid = false;
          }
        }
        break;
      case 3:
        // Step 3 is now Bidding Parameters
        stepValidation = validateStep2(
          formData.startPrice,
          formData.minimumIncrement,
          formData.auctionDuration.days,
          formData.auctionDuration.hours,
          formData.auctionDuration.minutes,
          formData.launchType,
          formData.scheduledStart,
          formData.bidExtension,
          formData.bidExtensionTime,
          formData.auctionSubType, // Added for auction sub-type validation
          formData.productQuantity // Added for multi-lot auctions
        );
        break;
      case 4:
        stepValidation = validateStep4(formData.participationType, formData.participantEmails);
        break;
      case 5:
        stepValidation = validateStep5(formData.termsAndConditions);
        break;
      case 7:
        if (formData.auctionType === "reverse") {
          stepValidation = validateStep7(formData.targetprice ?? 0, formData.requireddocuments ?? "");
        }
        break;
    }

    setValidationErrors(stepValidation.errors);
    setShowValidationErrors(!stepValidation.isValid);

    // Focus the first error field
    if (!stepValidation.isValid) {
      focusFirstErrorField(stepValidation.errors[0].field);
    }

    return stepValidation.isValid;
  };

  // Focus the first error field
  const focusFirstErrorField = (fieldName: string) => {
    setTimeout(() => {
      switch (fieldName) {
        case "startPrice":
          startPriceRef.current?.focus();
          break;
        case "minimumIncrement":
          minimumIncrementRef.current?.focus();
          break;
        case "auctionDuration":
          daysRef.current?.focus();
          break;
        case "productName":
          productNameRef.current?.focus();
          break;
        case "productDescription":
          productDescriptionRef.current?.focus();
          break;
        case "participantEmails":
          participantEmailRef.current?.focus();
          break;
        case "scheduledStart":
          scheduledDateRef.current?.focus();
          break;
        case "targetprice":
          // Add targetpriceRef if needed (to be added in Step 7 UI)
          break;
        case "requireddocuments":
          // Add requireddocumentsRef if needed (to be added in Step 7 UI)
          break;
      }
    }, 100);
  };

  // Check if a field has an error
  const hasError = (fieldName: string): boolean => {
    return validationErrors.some((error) => error.field === fieldName);
  };

  // Get error message for a field
  const getErrorMessage = (fieldName: string): string => {
    const error = validationErrors.find((error) => error.field === fieldName);
    return error ? error.message : "";
  };

  // Clear validation errors when changing steps
  useEffect(() => {
    setValidationErrors([]);
    setShowValidationErrors(false);
  }, [currentStep]);

const handleNext = () => {
  if (isAnimating) return;

  setIsAnimating(true);
  setDirection("forward");
  setPreviousStep(currentStep);

  const isValid = validateCurrentStep();
  if (!isValid) {
    setShowValidationErrors(true);
    setIsAnimating(false);
    return;
  }

  if (formData.auctionType === "reverse") {
    if (currentStep === 1) {
      setCurrentStep(7);
    } else if (currentStep === 7) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else {
      handleLaunchAuction(); // Launch from step 6
    }
  } else {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleLaunchAuction();
    }
  }

  setShowValidationErrors(false);
  setIsAnimating(false);
};
const handlePrevious = () => {
  if (isAnimating) return;

  setIsAnimating(true);
  setDirection("backward");
  setPreviousStep(currentStep);

  if (formData.auctionType === "reverse") {
    if (currentStep === 3) {
      setCurrentStep(7);
    } else if (currentStep === 7) {
      setCurrentStep(1);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 5) {
      setCurrentStep(4);
    } else if (currentStep === 6) {
      setCurrentStep(5);
    }
  } else {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  setShowValidationErrors(false);
  setIsAnimating(false);
};

  const handleSaveDraft = () => {
    // In a real app, this would save to backend or localStorage
    alert("Auction draft saved successfully!");
  };

  const handleLaunchAuction = async () => {
    let allValid = true;
    const allErrors: ValidationError[] = [];

    const step1Validation = validateStep1(formData.auctionType, formData.auctionSubType);
    if (!step1Validation.isValid) {
      allValid = false;
      allErrors.push(...step1Validation.errors);
    }

    const step2Validation = validateStep2(
      formData.startPrice,
      formData.minimumIncrement,
      formData.auctionDuration.days,
      formData.auctionDuration.hours,
      formData.auctionDuration.minutes,
      formData.launchType,
      formData.scheduledStart,
      formData.bidExtension,
      formData.bidExtensionTime,
      formData.auctionSubType, // Added for auction sub-type validation
      formData.productQuantity // Added for multi-lot auctions
    );
    if (!step2Validation.isValid) {
      allValid = false;
      allErrors.push(...step2Validation.errors);
    }

    if (formData.isMultiLot) {
      if (formData.lots.length === 0) {
        allValid = false;
        allErrors.push({ field: "lots", message: "Please add at least one lot" });
      } else {
        const invalidLots = formData.lots.filter(
          (lot) => !lot.name || !lot.description || lot.startPrice <= 0 || lot.minimumIncrement <= 0
        );
        if (invalidLots.length > 0) {
          allValid = false;
          allErrors.push({ field: "lots", message: "Please complete all required fields for each lot" });
        }
      }
    } else {
      const step3Validation = validateStep3(formData.productName, formData.productDescription, formData.auctionSubType, formData.productQuantity);
      if (!step3Validation.isValid) {
        allValid = false;
        allErrors.push(...step3Validation.errors);
      }
    }

    const step4Validation = validateStep4(formData.participationType, formData.participantEmails);
    if (!step4Validation.isValid) {
      allValid = false;
      allErrors.push(...step4Validation.errors);
    }

    const step5Validation = validateStep5(formData.termsAndConditions);
    if (!step5Validation.isValid) {
      allValid = false;
      allErrors.push(...step5Validation.errors);
    }

    // Validate Step 7 for reverse auctions
    if (formData.auctionType === "reverse") {
      const step7Validation = validateStep7(formData.targetprice ?? 0, formData.requireddocuments ?? "");;
      if (!step7Validation.isValid) {
        allValid = false;
        allErrors.push(...step7Validation.errors);
      }
    }

    if (!allValid) {
      setValidationErrors(allErrors);
      setShowValidationErrors(true);
      alert("Please fix all validation errors before launching the auction.");
      return;
    }

const { data: { session }, error } = await supabase.auth.getSession();

if (!session) {
  console.error("No active session");
  return;
}
  const userId = session.user.id;

    try {
      if (!user) {
        alert("Please log in to launch the auction.");
        return;
      }
      
      const formDataToSend = {
        ...formData,
        createdby: user.email,
        seller: userId,
        productimages: formData.productImages.map((img) => img.url),
        productdocuments: formData.productDocuments.map((doc) => doc.url || ""),
        percent: formData.bidIncrementType === "percentage" ? formData.bidIncrementRules[0]?.incrementValue : null,
        minimumIncrement: formData.bidIncrementType === "fixed" ? formData.bidIncrementRules[0]?.incrementValue : 0,
        targetprice: formData.targetprice, // Include targetprice if defined
        requireddocuments: formData.requireddocuments, // Include requireddocuments if defined
      };

      const res = await fetch(`/api/auctions?user=${encodeURIComponent(user.email)}`, {
        method: "POST",
         headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`, // This is important!
      },
        body: JSON.stringify(formDataToSend),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || "Failed to create auction.");
        return;
      }
      setIsLaunched(true);
    } catch (err) {
      alert("Failed to create auction. Please try again.");
    }
  };

  const handleGoToDashboard = () => {
    // In a real app, this would navigate to the dashboard
    alert("Navigating to dashboard...");
    // Reset the wizard state if needed
    setIsLaunched(false);
    setCurrentStep(1);
  };

  // Handler for uploaded images
  const handleImagesUploaded = async (newImages: UploadedFile[]) => {
    console.log("New images:", newImages); // Debug
    const files = newImages.map((img) => img.file as unknown as File); // Safer cast via unknown
    const uploadedFiles = await uploadImages(files);
    setFormData({
      ...formData,
      productImages: [
        ...formData.productImages,
        ...uploadedFiles.map((file) => ({
          ...file,
          url: file.url || "", // Ensure url is a string
        }) as const), // Type assertion to enforce UploadedFile shape
      ],
    });
  };

  const handleDocumentsUploaded = async (newDocuments: UploadedFile[]) => {
    const files = newDocuments.map((doc) => doc.file as unknown as File); // Safer cast via unknown
    const uploadedFiles = await uploadDocuments(files);
    setFormData({
      ...formData,
      productDocuments: [
        ...formData.productDocuments,
        ...uploadedFiles.map((file) => ({
          ...file,
          url: file.url || "", // Ensure url is a string
        }) as const), // Type assertion to enforce UploadedFile shape
      ],
    });
  };

  // Handler for removed images
  const handleImageRemoved = async (fileId: string) => {
    await removeImage(fileId);
    setFormData({
      ...formData,
      productImages: formData.productImages.filter((img) => img.id !== fileId),
    });
  };

  // Handler for removed documents
  const handleDocumentRemoved = async (fileId: string) => {
    await removeDocument(fileId);
    setFormData({
      ...formData,
      productDocuments: formData.productDocuments.filter((doc) => doc.id !== fileId),
    });
  };

  // Show confirmation modal before deleting a participant
  const confirmRemoveParticipant = (index: number) => {
    const email = formData.participantEmails[index];
    setDeletionInfo({
      type: "participant",
      index,
      name: email,
    });
    setShowDeleteModal(true);
  };
// Handle actual deletion after confirmation
const handleConfirmDelete = () => {
  if (!deletionInfo.type) return;

  if (deletionInfo.type === "participant") {
    const updatedEmails = [...formData.participantEmails];
    updatedEmails.splice(deletionInfo.index, 1);

    setFormData({
      ...formData,
      participantEmails: updatedEmails,
    });
  }

  // Close the modal and reset deletion info
  setShowDeleteModal(false);
  setDeletionInfo({ type: null, index: -1, name: "" });
};

// Cancel deletion
const handleCancelDelete = () => {
  setShowDeleteModal(false);
  setDeletionInfo({ type: null, index: -1, name: "" });
};

const handleAddParticipant = (email: string) => {
  if (!email.trim()) {
    setEmailError("Email cannot be empty");
    return;
  }

  if (!isValidEmail(email)) {
    setEmailError("Please enter a valid email address");
    return;
  }

  if (formData.participantEmails.includes(email)) {
    setEmailError("This email is already added");
    return;
  }

  setFormData({
    ...formData,
    participantEmails: [...formData.participantEmails, email],
  });
  setEmailInput("");
  setEmailError("");
};

// Handle scheduled date and time changes
const handleScheduledDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const dateValue = e.target.value;

  // Get the time portion from the existing scheduledStart
  const existingDate = new Date(formData.scheduledStart);
  const hours = existingDate.getHours().toString().padStart(2, "0");
  const minutes = existingDate.getMinutes().toString().padStart(2, "0");
  const timeString = `${hours}:${minutes}`;

  // Combine the new date with the existing time
  const newScheduledStart = new Date(`${dateValue}T${timeString}:00`);

  setFormData({
    ...formData,
    scheduledStart: newScheduledStart.toISOString(),
  });
};

const handleScheduledTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const timeValue = e.target.value;

  // Get the date portion from the existing scheduledStart
  const existingDate = new Date(formData.scheduledStart);
  const year = existingDate.getFullYear();
  const month = (existingDate.getMonth() + 1).toString().padStart(2, "0");
  const day = existingDate.getDate().toString().padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;

  // Combine the existing date with the new time
  const newScheduledStart = new Date(`${dateString}T${timeValue}:00`);

  setFormData({
    ...formData,
    scheduledStart: newScheduledStart.toISOString(),
  });
};

// Format date for input fields
const formatDateForInput = (isoString: string): string => {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

// Format time for input fields
const formatTimeForInput = (isoString: string): string => {
  const date = new Date(isoString);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

// Format date and time for display
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ... (AI Description Generation and remaining code would follow, but limited to 624 lines)

// AI Description Generation
const generateProductDescription = async () => {
  if (!formData.productName || !formData.categoryId) return;

  // Check if API key is available
  if (!apiKey) {
    setShowApiKeySetup(true);
    return;
  }

  setIsGeneratingDescription(true);
  setShowAiSuggestion(false);

  try {
    // Get category name for context
    const categoryName = PRODUCT_CATEGORIES.find((cat) => cat.id === formData.categoryId)?.name || "product";
    const subCategoryName = formData.subCategoryId
      ? PRODUCT_CATEGORIES.find((cat) => cat.id === formData.categoryId)?.subcategories?.find(
          (sub) => sub.id === formData.subCategoryId,
        )?.name
      : "";

    // Build comprehensive context from available product information
    const productContext = {
      name: formData.productName,
      category: categoryName,
      subCategory: subCategoryName || "",
      brand: formData.brand || "",
      model: formData.model || "",
      sku: formData.sku || "",
      auctionType: formData.auctionType,
      attributes: formData.attributes
        .filter((attr) => attr.value)
        .map((attr) => `${attr.name}: ${attr.value}`)
        .join(", "),
    };

    // Enhanced prompt for GPT-4 Turbo with more specific instructions
    const prompt = `Generate a compelling, professional product description for a ${formData.auctionType} auction listing.

PRODUCT DETAILS:
- Name: ${productContext.name}
- Category: ${productContext.category}${productContext.subCategory ? ` > ${productContext.subCategory}` : ""}
${productContext.brand ? `- Brand: ${productContext.brand}` : ""}
${productContext.model ? `- Model: ${productContext.model}` : ""}
${productContext.sku ? `- SKU: ${productContext.sku}` : ""}
${productContext.attributes ? `- Features: ${productContext.attributes}` : ""}
- Auction Type: ${formData.auctionType === "forward" ? "Forward Auction (buyers bid up)" : "Reverse Auction (suppliers bid down)"}

REQUIREMENTS:
- Write 150-200 words
- Use persuasive, professional language
- Highlight key features and benefits
- Include quality indicators and condition details
- Create urgency appropriate for auction format
- Focus on value proposition
- Use active voice and compelling adjectives
- End with a call-to-action for bidding

TONE: Professional, confident, and engaging
FORMAT: Single paragraph, no bullet points
FOCUS: ${formData.auctionType === "reverse" ? "Emphasize specifications and requirements for suppliers" : "Emphasize benefits and value for buyers"}`;

    const { text } = await generateText({
      model: openai("gpt-4-turbo", {
        apiKey: apiKey,
      }),
      prompt: prompt,
      system:
        "You are an expert auction copywriter specializing in creating high-converting product descriptions that maximize bidding activity and final sale prices. You understand buyer psychology and auction dynamics.",
      maxTokens: 300,
      temperature: 0.7,
    });

    setAiGeneratedDescription(text.trim());
    setShowAiSuggestion(true);
    setHasUserSeenAiSuggestion(true);
  } catch (error: any) {
    console.error("Error generating description:", error);
    // Enhanced error handling with user-friendly messages
    if (error.message?.includes("API key") || error.message?.includes("Unauthorized")) {
      alert("Invalid API key. Please check your OpenAI API key and try again.");
      setShowApiKeySetup(true);
    } else if (error.message?.includes("rate limit")) {
      alert("AI service is temporarily busy. Please try again in a moment.");
    } else if (error.message?.includes("model")) {
      alert("AI model temporarily unavailable. Please try again or write your description manually.");
    } else {
      alert("Unable to generate description at this time. Please write your own description.");
    }
  } finally {
    setIsGeneratingDescription(false);
  }
};

// Handle AI suggestion acceptance
const handleAcceptAiDescription = () => {
  setFormData({
    ...formData,
    productDescription: aiGeneratedDescription,
  });
  setShowAiSuggestion(false);
  setAiGeneratedDescription("");
};

// Handle AI suggestion rejection
const handleRejectAiDescription = () => {
  setShowAiSuggestion(false);
  setAiGeneratedDescription("");
  // Focus on the description textarea
  setTimeout(() => {
    productDescriptionRef.current?.focus();
  }, 100);
};

// Auto-generate description when key fields change
useEffect(() => {
  // Only auto-generate if we have minimum required information
  const hasMinimumInfo =
    formData.productName &&
    formData.categoryId &&
    formData.productName.length >= 3 &&
    !formData.productDescription &&
    !hasUserSeenAiSuggestion &&
    !isGeneratingDescription &&
    currentStep === 2 &&
    !formData.isMultiLot &&
    apiKey;

  if (hasMinimumInfo) {
    // Enhanced debouncing - wait for user to finish typing
    const timer = setTimeout(() => {
      // Double-check conditions haven't changed during debounce
      if (formData.productName && formData.categoryId && !formData.productDescription && !isGeneratingDescription) {
        generateProductDescription();
      }
    }, 1000); // 1 second debounce as requested

    return () => clearTimeout(timer);
  }
}, [
  formData.productName,
  formData.categoryId,
  formData.subCategoryId,
  formData.brand,
  formData.model,
  formData.attributes,
  formData.auctionType,
  currentStep,
  formData.isMultiLot,
  apiKey,
]);

// Get animation classes based on direction and animation state
const getAnimationClasses = () => {
  if (!isAnimating) return "opacity-100";

  return direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";
};

// Error message component
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center mt-1 text-destructive-600 dark:text-destructive-400 text-sm">
    <AlertCircle className="h-4 w-4 mr-1" />
    <span>{message}</span>
  </div>
);

// Get currency symbol
const getCurrencySymbol = (currency: Currency) => {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "INR":
      return "₹";
    case "AUD":
      return "A$";
    case "CAD":
      return "C$";
    case "CNY":
      return "¥";
    default:
      return "$";
  }
};

// Updated render section with translations
return (
  <div className={`min-h-screen bg-background p-4 md:p-8 transition-colors duration-300 ${inter.className}`}>
    <div className="max-w-4xl mx-auto card">
      {/* Header with Theme Toggle */}
      <div className="w-full bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("auctionBuilder")}</h1>
        <div className="flex items-center space-x-2">
          <div className="mr-2">
            <LanguageSelector value={formData.language} onChange={handleLanguageChange} />
          </div>
        </div>
      </div>

      {/* Progress Indicator - Update step labels */}
      <div className="w-full bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5, formData.auctionType === "reverse" ? 7 : 6].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all-smooth
                  ${
                    currentStep === step
                      ? "border-corporate-600 bg-corporate-600 text-white dark:border-corporate-500 dark:bg-corporate-500"
                      : currentStep > step
                        ? "border-corporate-600 bg-white text-corporate-600 dark:border-corporate-500 dark:bg-gray-800 dark:text-corporate-500"
                        : "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500"
                  }`}
              >
                {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              <span
                className={`mt-2 text-xs hidden sm:block transition-colors-smooth ${
                  currentStep >= step
                    ? "text-corporate-600 dark:text-corporate-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step === 1 && t("type")}
                {step === 2 && t("product")}
                {step === 3 && t("bidding")}
                {step === 4 && t("rules")}
                {step === 5 && t("terms")}
                {step === 7 && t("reverseDetails")} {/* New label for Step 7 */}
                {step === 6 && t("summary")}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full rounded-full">
            <div
              className="h-1 bg-corporate-600 dark:bg-corporate-500 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep - 1) * (100 / (formData.auctionType === "reverse" ? 6 : 5))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* API Key Setup Modal */}
      {showApiKeySetup && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Setup OpenAI API Key</h2>
            <ApiKeySetup onApiKeySet={handleApiKeySet} currentApiKey={apiKey} />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowApiKeySetup(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Summary */}
      {showValidationErrors && validationErrors.length > 0 && (
        <div className="bg-destructive-50 dark:bg-destructive-900/20 border border-destructive-200 dark:border-destructive-800 text-destructive-700 dark:text-destructive-300 p-4 m-4 rounded-md animate-fade-in">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium">{t("pleaseFixErrors")}</h3>
              <ul className="mt-1 list-disc list-inside text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="p-6 relative overflow-hidden bg-white dark:bg-gray-800 transition-colors duration-300">
        <div className={getAnimationClasses()}>
          {/* Step 1: Auction Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("selectAuctionType")}</h2>

              {showTemplateSelector ? (
                <div className="space-y-6">
                  <p className="text-gray-600 dark:text-gray-300">{t("startWithTemplate")}</p>
                  <TemplateSelector
                    onSelectTemplate={handleSelectTemplate}
                    onCreateNew={() => setShowTemplateSelector(false)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("auctionDirection")} <span className="text-destructive-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                          ${
                            formData.auctionType === "forward"
                              ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                              : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                          } ${hasError("auctionType") ? "border-destructive-500 dark:border-destructive-400" : ""}`}
                        onClick={() => setFormData({ ...formData, auctionType: "forward" })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium dark:text-gray-100">{t("forwardAuction")}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("forwardAuctionDesc")}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border transition-all-smooth ${
                              formData.auctionType === "forward"
                                ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {formData.auctionType === "forward" && <CheckCircle className="w-5 h-5 text-white" />}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                          ${
                            formData.auctionType === "reverse"
                              ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                              : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                          } ${hasError("auctionType") ? "border-destructive-500 dark:border-destructive-400" : ""}`}
                        onClick={() => setFormData({ ...formData, auctionType: "reverse" })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium dark:text-gray-100">{t("reverseAuction")}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("reverseAuctionDesc")}<br /><span className="text-xs text-gray-400">Includes an additional step for target price and required documents.</span></p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border transition-all-smooth ${
                              formData.auctionType === "reverse"
                                ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {formData.auctionType === "reverse" && <CheckCircle className="w-5 h-5 text-white" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    {hasError("auctionType") && <ErrorMessage message={getErrorMessage("auctionType")} />}
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("auctionFormat")} <span className="text-destructive-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.auctionType === "forward" && (
                        <>
                          <div
                            className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                              ${
                                formData.auctionSubType === "english"
                                  ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                  : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                              }`}
                            onClick={() => setFormData({ ...formData, auctionSubType: "english" })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium dark:text-gray-100">{t("englishAuction")}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("englishAuctionDesc")}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border transition-all-smooth ${
                                  formData.auctionSubType === "english"
                                    ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {formData.auctionSubType === "english" && <CheckCircle className="w-5 h-5 text-white" />}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                              ${
                                formData.auctionSubType === "silent"
                                  ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                  : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                              }`}
                            onClick={() => setFormData({ ...formData, auctionSubType: "silent" })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium dark:text-gray-100">{t("silentAuction")}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("silentAuctionDesc")}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border transition-all-smooth ${
                                  formData.auctionSubType === "silent"
                                    ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {formData.auctionSubType === "silent" && <CheckCircle className="w-5 h-5 text-white" />}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {formData.auctionType === "reverse" && (
                        <>
                          <div
                            className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                              ${
                                formData.auctionSubType === "sealed-bid"
                                  ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                  : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                              }`}
                            onClick={() => setFormData({ ...formData, auctionSubType: "sealed-bid" })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium dark:text-gray-100">{t("sealedBidAuction")}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("sealedBidAuctionDesc")}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border transition-all-smooth ${
                                  formData.auctionSubType === "sealed-bid"
                                    ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {formData.auctionSubType === "sealed-bid" && <CheckCircle className="w-5 h-5 text-white" />}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                              ${
                                formData.auctionSubType === "reverse-clock"
                                  ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                  : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                              }`}
                            onClick={() => setFormData({ ...formData, auctionSubType: "reverse-clock" })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium dark:text-gray-100">{t("reverseClockAuction")}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("reverseClockAuctionDesc")}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border transition-all-smooth ${
                                  formData.auctionSubType === "reverse-clock"
                                    ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {formData.auctionSubType === "reverse-clock" && <CheckCircle className="w-5 h-5 text-white" />}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {hasError("auctionSubType") && <ErrorMessage message={getErrorMessage("auctionSubType")} />}
                  </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("auctionSubType")} <span className="text-destructive-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.auctionType === "forward" ? (
                          <>
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "english"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "english" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("englishAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("englishAuctionDesc")}</p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "silent"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "silent" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("silentAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("silentAuctionDesc")}</p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "dutch"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "dutch" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("dutchAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("dutchAuctionDesc")}</p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "sealed"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "sealed" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("sealedBidAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("sealedBidAuctionDesc")}</p>
                            </div>
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "yankee"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "yankee" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("yankeeAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("yankeeAuctionDesc")}</p>
                            </div>
                            
                          </>
                        ) : (
                          <>
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "sealed-bid"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "sealed-bid" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("sealedBidReverse")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("sealedBidReverseDesc")}</p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "reverse-clock"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "reverse-clock" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("reverseClockAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t("reverseClockAuctionDesc")}</p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "standard"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "standard" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("standardReverseAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("standardReverseAuctionDesc")}
                              </p>
                            </div>

                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                                ${
                                  formData.auctionSubType === "japanese"
                                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                                } ${
                                  hasError("auctionSubType") ? "border-destructive-500 dark:border-destructive-400" : ""
                                }`}
                              onClick={() => setFormData({ ...formData, auctionSubType: "japanese" })}
                            >
                              <h3 className="font-medium dark:text-gray-100">{t("japaneseReverseAuction")}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("japaneseReverseAuctionDesc")}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      {hasError("auctionSubType") && <ErrorMessage message={getErrorMessage("auctionSubType")} />}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Silent Auction Mode for Forward Auctions */}
            {formData.auctionType === "forward" && (
              <div className="space-y-4 border-t pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{t("auctionVisibility")}</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isSilentAuction"
                    className="form-checkbox"
                    checked={formData.isSilentAuction}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isSilentAuction: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="isSilentAuction" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t("enableSilentAuctionMode")}
                  </label>
                </div>
                {formData.isSilentAuction && (
                  <div className="ml-6 text-sm text-gray-600 dark:text-gray-400 animate-fade-in">
                    <p>{t("inSilentAuctionMode")}</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>{t("biddersCannotSeeBids")}</li>
                      <li>{t("onlyAuctionCreatorSeesBids")}</li>
                      <li>{t("biddersOnlySeeOwnBids")}</li>
                      <li>{t("createsCompetitiveBidding")}</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Product/Lot Details (moved from step 3) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("productDetails")}</h2>

                {/* API Key Setup Banner */}
                {!apiKey && <ApiKeySetup onApiKeySet={handleApiKeySet} currentApiKey={apiKey} />}

                <div className="space-y-4 border-b pb-6 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("lotConfiguration")}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                        ${
                          !formData.isMultiLot
                            ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                            : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                        }`}
                      onClick={() => setFormData({ ...formData, isMultiLot: false })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium dark:text-gray-100">{t("singleProduct")}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("singleProductDesc")}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border transition-all-smooth ${
                            !formData.isMultiLot
                              ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {!formData.isMultiLot && <CheckCircle className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                        ${
                          formData.isMultiLot
                            ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                            : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                        }`}
                      onClick={() => setFormData({ ...formData, isMultiLot: true })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium dark:text-gray-100">{t("multipleLots")}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("multipleLotsDesc")}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border transition-all-smooth ${
                            formData.isMultiLot
                              ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {formData.isMultiLot && <CheckCircle className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.isMultiLot ? (
                  <LotManager
                    lots={formData.lots}
                    onChange={(lots) => setFormData({ ...formData, lots })}
                    currency={formData.currency}
                  />
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="productName"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        {t("productName")} <span className="text-destructive-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="productName"
                        ref={productNameRef}
                        className={`form-input ${
                          hasError("productName")
                            ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                            : ""
                        }`}
                        placeholder={t("enterProductName")}
                        value={formData.productName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            productName: e.target.value,
                          })
                        }
                      />
                      {hasError("productName") && <ErrorMessage message={getErrorMessage("productName")} />}
                    </div>
                                            {formData.auctionSubType === "yankee" && (
  <div>
    <label
      htmlFor="productQuantity"
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
    >
      Quantity <span className="text-destructive-500">*</span>
    </label>
    <input
      type="number"
      id="productQuantity"
      min={1}
      className={`form-input ${
        hasError("productQuantity")
          ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
          : ""
      }`}
      placeholder="Enter quantity"
      value={formData.productQuantity || ""}
      onChange={(e) =>
        setFormData({
          ...formData,
          productQuantity: e.target.value === "" ? undefined : parseInt(e.target.value),
        })
      }
    />
    {hasError("productQuantity") && <ErrorMessage message={getErrorMessage("productQuantity")} />}
  </div>
)}


                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="productDescription"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {t("productDescription")} <span className="text-destructive-500">*</span>
                        </label>
                        {/* Enhanced Generate Button Section */}
                        <div className="flex space-x-2">
                          {/* Show regenerate button if AI description was already generated */}
                          {hasUserSeenAiSuggestion && !showAiSuggestion && apiKey && !isGeneratingDescription && (
                            <button
                              type="button"
                              onClick={generateProductDescription}
                              className="btn-secondary btn-sm flex items-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Regenerate with AI
                            </button>
                          )}

                          {/* Show generate button if conditions are met and not currently generating */}
                          {formData.productName &&
                            formData.categoryId &&
                            !formData.productDescription &&
                            !hasUserSeenAiSuggestion &&
                            apiKey &&
                            !isGeneratingDescription && (
                              <button
                                type="button"
                                onClick={generateProductDescription}
                                className="btn-primary btn-sm flex items-center shadow-sm hover:shadow-md transition-all"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                Generate with AI
                              </button>
                            )}

                          {/* Show loading button when generating */}
                          {isGeneratingDescription && (
                            <button
                              type="button"
                              disabled
                              className="btn-primary btn-sm flex items-center opacity-75 cursor-not-allowed"
                            >
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Generating...
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Enhanced AI Suggestion Modal with Loading Spinner */}
                      {showAiSuggestion && aiGeneratedDescription && (
                        <div className="mb-4 p-4 border border-corporate-200 dark:border-corporate-700 rounded-lg bg-gradient-to-r from-corporate-50 to-blue-50 dark:from-corporate-900/30 dark:to-blue-900/30 animate-fade-in shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center">
                              <div className="flex items-center justify-center w-8 h-8 bg-corporate-100 dark:bg-corporate-800 rounded-full mr-3">
                                <svg
                                  className="w-4 h-4 text-corporate-600 dark:text-corporate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-corporate-800 dark:text-corporate-200">
                                  AI-Generated Description
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Generated with GPT-4 Turbo based on your product details
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAiSuggestion(false)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border text-sm text-gray-700 dark:text-gray-300 mb-4 max-h-40 overflow-y-auto leading-relaxed shadow-inner">
                            {aiGeneratedDescription}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>
                                {aiGeneratedDescription.length} characters • Optimized for {formData.auctionType}{" "}
                                auctions
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={handleRejectAiDescription}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                              >
                                Write My Own
                              </button>
                              <button
                                type="button"
                                onClick={handleAcceptAiDescription}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-corporate-600 hover:bg-corporate-700 dark:bg-corporate-500 dark:hover:bg-corporate-600 rounded-md transition-colors shadow-sm"
                              >
                                Use This Description
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Loading State */}
                      {isGeneratingDescription && (
                        <div className="mb-4 p-4 border border-corporate-200 dark:border-corporate-700 rounded-lg bg-gradient-to-r from-corporate-50 to-blue-50 dark:from-corporate-900/30 dark:to-blue-900/30 animate-pulse">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-corporate-100 dark:bg-corporate-800 rounded-full mr-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-corporate-600 dark:border-corporate-400"></div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-corporate-800 dark:text-corporate-200">
                                Generating Description...
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                AI is analyzing your product details to create a compelling description
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 bg-white dark:bg-gray-800 p-4 rounded-lg border">
                            <div className="animate-pulse space-y-2">
                              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      <textarea
                        id="productDescription"
                        ref={productDescriptionRef}
                        rows={4}
                        className={`form-input ${
                          hasError("productDescription")
                            ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                            : ""
                        }`}
                        placeholder={t("enterProductDescription")}
                        value={formData.productDescription}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            productDescription: e.target.value,
                          })
                        }
                      />
                      {hasError("productDescription") && (
                        <ErrorMessage message={getErrorMessage("productDescription")} />
                      )}

                      {formData.productDescription && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {formData.productDescription.length} characters
                        </div>
                      )}
                    </div>

                    {/* Product Classification */}
                    <ProductClassification
                      categoryId={formData.categoryId}
                      subCategoryId={formData.subCategoryId}
                      attributes={formData.attributes}
                      sku={formData.sku}
                      brand={formData.brand}
                      model={formData.model}
                      onCategoryChange={(categoryId, subCategoryId) =>
                        setFormData((prev) => ({ ...prev, categoryId, subCategoryId }))
                      }
                      onAttributesChange={(attributes) => setFormData((prev) => ({ ...prev, attributes }))}
                      onSkuChange={(sku) => setFormData((prev) => ({ ...prev, sku }))}
                      onBrandChange={(brand) => setFormData((prev) => ({ ...prev, brand }))}
                      onModelChange={(model) => setFormData((prev) => ({ ...prev, model }))}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("productImages")}
                      </label>
                      <FileUploader
                        accept="image/*"
                        type="image"
                        uploadedFiles={formData.productImages}
                        onFilesUploaded={handleImagesUploaded}
                        onFileRemoved={handleImageRemoved}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("productDocuments")}
                      </label>
                      <FileUploader
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                        maxFiles={10}
                        maxSize={10 * 1024 * 1024} // 10MB
                        uploadedFiles={formData.productDocuments}
                        onFilesUploaded={handleDocumentsUploaded}
                        onFileRemoved={handleDocumentRemoved}
                        type="document"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Bidding Parameters */}
{currentStep === 3 && (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("biddingParameters")}</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label
          htmlFor="startPrice"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {t("startPrice")}
          <span className="text-destructive-500">*</span>
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
              {getCurrencySymbol(formData.currency)}
            </span>
          </div>
          <input
            type="number"
            id="startPrice"
            ref={startPriceRef}
            className={`form-input pl-7 pr-12 ${
              hasError("startPrice")
                ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                : ""
            }`}
            placeholder="0.00"
            value={formData.startPrice}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                startPrice: Number.parseFloat(e.target.value) || 0,
              }))
            }
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <select
              id="currency"
              name="currency"
              className="form-select h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 sm:text-sm rounded-md"
              value={formData.currency}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  currency: e.target.value as Currency,
                }))
              }
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CAD">CAD</option>
              <option value="INR">INR</option>
              <option value="AUD">AUD</option>
              <option value="CNY">CNY</option>
            </select>
          </div>
        </div>
        {hasError("startPrice") && <ErrorMessage message={getErrorMessage("startPrice")} />}
      </div>

      {formData.auctionSubType !== "yankee" && (
        <div>
          <label
            htmlFor="minimumIncrement"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("minimumBidIncrement")}
            <span className="text-destructive-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                {getCurrencySymbol(formData.currency)}
              </span>
            </div>
            <input
              type="number"
              id="minimumIncrement"
              ref={minimumIncrementRef}
              className={`form-input pl-7 pr-12 ${
                hasError("minimumIncrement")
                  ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                  : ""
              }`}
              placeholder="0.00"
              value={formData.minimumIncrement}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minimumIncrement: Number.parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
          {hasError("minimumIncrement") && <ErrorMessage message={getErrorMessage("minimumIncrement")} />}
        </div>
      )}
    </div>

    {formData.auctionSubType !== "yankee" && (
      <BidIncrementConfig
        bidIncrementType={formData.bidIncrementType}
        bidIncrementRules={formData.bidIncrementRules}
        currency={formData.currency}
        onIncrementTypeChange={(type) =>
          setFormData((prev) => {
            let updatedMinimumIncrement = prev.minimumIncrement;
            let updatedPercent = prev.percent;
            if (type === "percentage") {
              updatedPercent = prev.bidIncrementRules[0]?.incrementValue || 5; // Default to 5%
              if (prev.minimumIncrement === 0 || prev.bidIncrementType !== "fixed") {
                updatedMinimumIncrement = 1;
              }
            } else if (type === "fixed") {
              updatedMinimumIncrement = prev.bidIncrementRules[0]?.incrementValue || 0;
              updatedPercent = null;
            }
            return {
              ...prev,
              bidIncrementType: type,
              minimumIncrement: updatedMinimumIncrement,
              percent: updatedPercent,
            };
          })
        }
        onRulesChange={(rules) =>
          setFormData((prev) => {
            let updatedMinimumIncrement = prev.minimumIncrement;
            let updatedPercent = prev.percent;
            if (prev.bidIncrementType === "percentage" && rules[0]?.incrementValue) {
              updatedPercent = rules[0].incrementValue;
              if (prev.minimumIncrement === 0 || prev.bidIncrementType !== "fixed") {
                updatedMinimumIncrement = 1;
              }
            } else if (prev.bidIncrementType === "fixed" && rules[0]?.incrementValue) {
              updatedMinimumIncrement = rules[0].incrementValue;
              updatedPercent = null;
            }
            return {
              ...prev,
              bidIncrementRules: rules,
              minimumIncrement: updatedMinimumIncrement,
              percent: updatedPercent,
            };
          })
        }
      />
    )}

    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("auctionDuration")} <span className="text-destructive-500">*</span>
      </label>
      <div
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
          hasError("auctionDuration")
            ? "border border-destructive-500 dark:border-destructive-400 p-3 rounded-md"
            : ""
        }`}
      >
        <div>
          <label htmlFor="days" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("days")}
          </label>
          <input
            type="number"
            id="days"
            ref={daysRef}
            min="0"
            max="30"
            className="form-input"
            value={formData.auctionDuration.days}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                auctionDuration: {
                  ...prev.auctionDuration,
                  days: Number.parseInt(e.target.value) || 0,
                },
              }))
            }
          />
        </div>

        <div>
          <label htmlFor="hours" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("hours")}
          </label>
          <input
            type="number"
            id="hours"
            min="0"
            max="23"
            className="form-input"
            value={formData.auctionDuration.hours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                auctionDuration: {
                  ...prev.auctionDuration,
                  hours: Number.parseInt(e.target.value) || 0,
                },
              }))
            }
          />
        </div>

        <div>
          <label htmlFor="minutes" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("minutes")}
          </label>
          <input
            type="number"
            id="minutes"
            min="0"
            max="59"
            className="form-input"
            value={formData.auctionDuration.minutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                auctionDuration: {
                  ...prev.auctionDuration,
                  minutes: Number.parseInt(e.target.value) || 0,
                },
              }))
            }
          />
        </div>
      </div>
      {hasError("auctionDuration") && <ErrorMessage message={getErrorMessage("auctionDuration")} />}

      <div className="bg-corporate-50 dark:bg-corporate-900/30 p-4 rounded-md flex items-start animate-fade-in">
        <Clock className="w-5 h-5 text-corporate-500 dark:text-corporate-400 mt-0.5 mr-2 flex-shrink-0" />
        <p className="text-sm text-corporate-700 dark:text-corporate-300">
          {t("auctionWillRunFor")} {formData.auctionDuration.days} {t("days")}, {formData.auctionDuration.hours}{" "}
          {t("hours")}, and {formData.auctionDuration.minutes} {t("minutes")} {t("afterLaunch")}.
        </p>
      </div>
    </div>

    {/* Anti-Sniping Controls */}
    <div className="space-y-4 border-t pt-4 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("antiSnipingControls")}
      </label>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="bidExtension"
          className="form-checkbox"
          checked={formData.bidExtension}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              bidExtension: e.target.checked,
            }))
          }
        />
        <label htmlFor="bidExtension" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {t("enableBidExtension")}
        </label>
      </div>

      {formData.bidExtension && (
        <div className="ml-6 animate-fade-in">
          <label htmlFor="bidExtensionTime" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
            {t("extendAuctionIfBid")}
          </label>
          <div className="flex items-center">
            <input
              type="number"
              id="bidExtensionTime"
              min="1"
              max="30"
              className="form-input w-20"
              value={formData.bidExtensionTime}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  bidExtensionTime: Number.parseInt(e.target.value) || 5,
                }))
              }
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t("minutes")}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("preventsLastSecondBidding")}</p>
        </div>
      )}
    </div>

    {/* Auto-Bidding */}
    <div className="space-y-4 border-t pt-4 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("automatedBidding")}
      </label>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="allowAutoBidding"
          className="form-checkbox"
          checked={formData.allowAutoBidding}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              allowAutoBidding: e.target.checked,
            }))
          }
        />
        <label htmlFor="allowAutoBidding" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {t("allowParticipantsAutoBidding")}
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("participantsCanSetMaxBid")}</p>
    </div>

    {/* Reserve Price */}
    <div className="space-y-4 border-t pt-4 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("reservePrice")}
      </label>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="enableReservePrice"
          className="form-checkbox"
          checked={formData.reservePrice !== undefined}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              reservePrice: e.target.checked ? 0 : undefined,
            }))
          }
        />
        <label htmlFor="enableReservePrice" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {t("setReservePrice")}
        </label>
      </div>

      {formData.reservePrice !== undefined && (
        <div className="ml-6 animate-fade-in">
          <label htmlFor="reservePrice" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
            {t("reservePrice")}
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                {getCurrencySymbol(formData.currency)}
              </span>
            </div>
            <input
              type="number"
              id="reservePrice"
              className="form-input pl-7"
              placeholder="0.00"
              value={formData.reservePrice}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reservePrice: Number.parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("auctionWillNotComplete")}</p>
        </div>
      )}
    </div>

    {/* Scheduled Auction Section */}
    <div className="space-y-4 border-t pt-6 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("launchType")} <span className="text-destructive-500">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover:scale-105 ${
            formData.launchType === "immediate"
              ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
              : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
          }`}
          onClick={() => setFormData((prev) => ({ ...prev, launchType: "immediate" }))}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium dark:text-gray-100">{t("launchImmediately")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("auctionWillStartAsSoon")}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border transition-all-smooth ${
                formData.launchType === "immediate"
                  ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {formData.launchType === "immediate" && <CheckCircle className="w-5 h-5 text-white" />}
            </div>
          </div>
        </div>

        <div
          className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover:scale-105 ${
            formData.launchType === "scheduled"
              ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
              : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
          }`}
          onClick={() => setFormData((prev) => ({ ...prev, launchType: "scheduled" }))}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium dark:text-gray-100">{t("scheduleForLater")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("setFutureDateAndTime")}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border transition-all-smooth ${
                formData.launchType === "scheduled"
                  ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {formData.launchType === "scheduled" && <CheckCircle className="w-5 h-5 text-white" />}
            </div>
          </div>
        </div>
      </div>

      {formData.launchType === "scheduled" && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="scheduledDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("startDate")} <span className="text-destructive-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="date"
                  id="scheduledDate"
                  ref={scheduledDateRef}
                  className={`form-input pl-10 ${
                    hasError("scheduledStart")
                      ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                      : ""
                  }`}
                  value={formatDateForInput(formData.scheduledStart)}
                  min={formatDateForInput(new Date().toISOString())}
                  onChange={handleScheduledDateChange}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="scheduledTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("startTime")} <span className="text-destructive-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="time"
                  id="scheduledTime"
                  ref={scheduledTimeRef}
                  className={`form-input pl-10 ${
                    hasError("scheduledStart")
                      ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                      : ""
                  }`}
                  value={formatTimeForInput(formData.scheduledStart)}
                  onChange={handleScheduledDateChange}
                />
              </div>
            </div>
          </div>
          {hasError("scheduledStart") && <ErrorMessage message={getErrorMessage("scheduledStart")} />}

          <div className="bg-corporate-50 dark:bg-corporate-900/30 p-4 rounded-md flex items-start">
            <Calendar className="w-5 h-5 text-corporate-500 dark:text-corporate-400 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-corporate-700 dark:text-corporate-300">
              {t("auctionWillBeScheduled")} {formatDateTime(formData.scheduledStart)}.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
)}

            {/* Step 4: Participation Rules */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("participationRules")}</h2>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("whoCanParticipate")} <span className="text-destructive-500">*</span>
                  </label>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${
                      hasError("participationType")
                        ? "border border-destructive-500 dark:border-destructive-400 p-3 rounded-md"
                        : ""
                    }`}
                  >
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                        ${
                          formData.participationType === "public"
                            ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                            : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                        }`}
                      onClick={() => setFormData({ ...formData, participationType: "public" })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium dark:text-gray-100">{t("public")}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("anyoneCanParticipate")}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border transition-all-smooth ${
                            formData.participationType === "public"
                              ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {formData.participationType === "public" && <CheckCircle className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                        ${
                          formData.participationType === "verified"
                            ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                            : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                        }`}
                      onClick={() => setFormData({ ...formData, participationType: "verified" })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium dark:text-gray-100">{t("verifiedUsers")}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("onlyVerifiedUsers")}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border transition-all-smooth ${
                            formData.participationType === "verified"
                              ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {formData.participationType === "verified" && <CheckCircle className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                        ${
                          formData.participationType === "invite-only"
                            ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                            : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                        }`}
                      onClick={() => setFormData({ ...formData, participationType: "invite-only" })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium dark:text-gray-100">{t("inviteOnly")}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t("onlyInvitedParticipants")}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border transition-all-smooth ${
                            formData.participationType === "invite-only"
                              ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {formData.participationType === "invite-only" && (
                            <CheckCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {hasError("participationType") && <ErrorMessage message={getErrorMessage("participationType")} />}
                </div>

                {formData.participationType === "invite-only" && (
                  <div className="space-y-4 mt-6 animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("participantEmailList")}{" "}
                      {hasError("participantEmails") && <span className="text-destructive-500">*</span>}
                    </label>
                    <div className="flex">
                      <input
                        type="email"
                        id="participantEmail"
                        ref={participantEmailRef}
                        className={`form-input rounded-r-none ${
                          emailError
                            ? "border-destructive-500 dark:border-destructive-400 focus:border-destructive-500 dark:focus:border-destructive-400 focus:ring-destructive-500/20 dark:focus:ring-destructive-400/20"
                            : ""
                        }`}
                        placeholder={t("enterEmailAddress")}
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value)
                          setEmailError("")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddParticipant(emailInput)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-primary btn-md rounded-l-none active-scale"
                        onClick={() => handleAddParticipant(emailInput)}
                      >
                        {t("add")}
                      </button>
                    </div>
                    {emailError && <ErrorMessage message={emailError} />}

                    {formData.participantEmails.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {formData.participantEmails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:border-corporate-200 dark:hover:border-corporate-700 transition-colors-smooth animate-fade-in"
                          >
                            <div className="flex items-center">
                              <Users className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                              <span className="text-sm dark:text-gray-200">{email}</span>
                            </div>
                            <button
                              type="button"
                              className="text-destructive-500 dark:text-destructive-400 hover:text-destructive-700 dark:hover:text-destructive-300 transition-colors-smooth active-scale"
                              onClick={() => confirmRemoveParticipant(index)}
                              aria-label={`Remove participant ${email}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`text-sm text-gray-500 dark:text-gray-400 mt-2 ${
                          hasError("participantEmails") ? "text-destructive-500 dark:text-destructive-400" : ""
                        }`}
                      >
                        {t("noParticipantsAddedYet")}
                      </div>
                    )}
                    {hasError("participantEmails") && <ErrorMessage message={getErrorMessage("participantEmails")} />}
                  </div>
                )}

                <div className="space-y-4 border-t pt-6 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t("qualificationCriteria")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("defineRequirementsParticipants")}</p>

                  <QualificationCriteriaManager
                    criteria={formData.qualificationCriteria}
                    onChange={(criteria) => setFormData({ ...formData, qualificationCriteria: criteria })}
                  />
                </div>

                <div className="space-y-4 border-t pt-6 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t("notificationSettings")}</h3>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableNotifications"
                      className="form-checkbox"
                      checked={formData.enableNotifications}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          enableNotifications: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="enableNotifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t("enableParticipantNotifications")}
                    </label>
                  </div>

                  {formData.enableNotifications && (
                    <div className="ml-6 space-y-2 animate-fade-in">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyEmail"
                          className="form-checkbox"
                          checked={formData.notificationTypes.includes("email")}
                          onChange={(e) => {
                            const updatedTypes = e.target.checked
                              ? [...formData.notificationTypes, "email"]
                              : formData.notificationTypes.filter((type) => type !== "email")
                            setFormData({
                              ...formData,
                              notificationTypes: updatedTypes,
                            })
                          }}
                        />
                        <label htmlFor="notifyEmail" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {t("emailNotifications")}
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifySMS"
                          className="form-checkbox"
                          checked={formData.notificationTypes.includes("sms")}
                          onChange={(e) => {
                            const updatedTypes = e.target.checked
                              ? [...formData.notificationTypes, "sms"]
                              : formData.notificationTypes.filter((type) => type !== "sms")
                            setFormData({
                              ...formData,
                              notificationTypes: updatedTypes,
                            })
                          }}
                        />
                        <label htmlFor="notifySMS" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {t("smsNotifications")}
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyPush"
                          className="form-checkbox"
                          checked={formData.notificationTypes.includes("push")}
                          onChange={(e) => {
                            const updatedTypes = e.target.checked
                              ? [...formData.notificationTypes, "push"]
                              : formData.notificationTypes.filter((type) => type !== "push")
                            setFormData({
                              ...formData,
                              notificationTypes: updatedTypes,
                            })
                          }}
                        />
                        <label htmlFor="notifyPush" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {t("pushNotifications")}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Terms & Conditions */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("termsAndConditions")}</h2>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("defineTermsAndConditions")}</p>

                  <TermsAndConditionsManager
                    terms={formData.termsAndConditions}
                    onChange={(terms) => setFormData({ ...formData, termsAndConditions: terms })}
                  />
                </div>

                <div className="space-y-4 border-t pt-6 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t("disputeResolution")}</h3>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableDispute"
                      className="form-checkbox"
                      checked={formData.enableDispute}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          enableDispute: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="enableDispute" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t("enableDisputeResolution")}
                    </label>
                  </div>

                  {formData.enableDispute && (
                    <div className="ml-6 space-y-2 animate-fade-in">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t("allowParticipantsRaiseDisputes")}</p>
                      {/* Add dispute resolution settings here */}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Summary */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("auctionSummary")}</h2>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("reviewAuctionDetails")}</p>

                  {/* Display auction summary here */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">{t("auctionDetails")}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("auctionType")}: {formData.auctionType} - {formData.auctionSubType}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("startPrice")}: {getCurrencySymbol(formData.currency)}
                      {formData.startPrice}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("minimumIncrement")}: {getCurrencySymbol(formData.currency)}
                      {formData.minimumIncrement}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("auctionDuration")}: {formData.auctionDuration.days} {t("days")},{" "}
                      {formData.auctionDuration.hours} {t("hours")}, {formData.auctionDuration.minutes} {t("minutes")}
                    </p>
                    {formData.launchType === "scheduled" && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("scheduledStart")}: {formatDateTime(formData.scheduledStart)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
{/* Step 7: Reverse Auction Details */}
{currentStep === 7 && formData.auctionType === "reverse" && (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("reverseDetails")}</h2>

    {/* Product Name */}
    <div>
      <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("productName")} <span className="text-destructive-500">*</span>
      </label>
      <input
        type="text"
        id="productName"
        className={`form-input ${hasError("productName") ? "border-destructive-500" : ""}`}
        value={formData.productName || ""}
        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
      />
      {hasError("productName") && <ErrorMessage message={getErrorMessage("productName")} />}
    </div>

    {/* Product Description */}
    <div>
      <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("productDescription")} <span className="text-destructive-500">*</span>
      </label>
      <textarea
        id="productDescription"
        rows={4}
        className={`form-input ${hasError("productDescription") ? "border-destructive-500" : ""}`}
        value={formData.productDescription || ""}
        onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
      />
      {hasError("productDescription") && <ErrorMessage message={getErrorMessage("productDescription")} />}
    </div>

    {/* Product Classification */}
    <ProductClassification
      categoryId={formData.categoryId}
      subCategoryId={formData.subCategoryId}
      attributes={formData.attributes || { condition: "" }} // Default empty condition
      sku={formData.sku || ""}
      brand={formData.brand || ""}
      model={formData.model || ""}
      onCategoryChange={(categoryId, subCategoryId) =>
        setFormData((prev) => ({ ...prev, categoryId, subCategoryId }))
      }
      onAttributesChange={(attributes) => setFormData((prev) => ({ ...prev, attributes }))}
      onSkuChange={(sku) => setFormData((prev) => ({ ...prev, sku }))}
      onBrandChange={(brand) => setFormData((prev) => ({ ...prev, brand }))}
      onModelChange={(model) => setFormData((prev) => ({ ...prev, model }))}
    />
    {hasError("categoryId") && <ErrorMessage message={getErrorMessage("categoryId")} />}
    {hasError("subCategoryId") && <ErrorMessage message={getErrorMessage("subCategoryId")} />}
    {hasError("attributes") && <ErrorMessage message={getErrorMessage("attributes")} />}
    {hasError("sku") && <ErrorMessage message={getErrorMessage("sku")} />}
    {hasError("brand") && <ErrorMessage message={getErrorMessage("brand")} />}
    {hasError("model") && <ErrorMessage message={getErrorMessage("model")} />}

    {/* Product Details (Lot Configuration like Step 2) */}
    <div className="space-y-4 border-b pb-6 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("lotConfiguration")}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
            ${
              !formData.isMultiLot
                ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
            }`}
          onClick={() => setFormData({ ...formData, isMultiLot: false })}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium dark:text-gray-100">{t("singleProduct")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("singleProductDesc")}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border transition-all-smooth ${
                !formData.isMultiLot
                  ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {!formData.isMultiLot && <CheckCircle className="w-5 h-5 text-white" />}
            </div>
          </div>
        </div>

        <div
          className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
            ${
              formData.isMultiLot
                ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
            }`}
          onClick={() => setFormData({ ...formData, isMultiLot: true })}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium dark:text-gray-100">{t("multipleLots")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("multipleLotsDesc")}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border transition-all-smooth ${
                formData.isMultiLot
                  ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {formData.isMultiLot && <CheckCircle className="w-5 h-5 text-white" />}
            </div>
          </div>
        </div>
      </div>
      {formData.isMultiLot && (
        <LotManager
          lots={formData.lots}
          onChange={(lots) => setFormData({ ...formData, lots })}
          currency={formData.currency}
        />
      )}
    </div>

    {/* Target Price with Currency Selector */}
    <div>
      <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("Target Price")} <span className="text-destructive-500">*</span>
      </label>
      <div className="flex space-x-2">
        <select
          id="currency"
          className="form-select w-1/4"
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="JPY">JPY</option>
          <option value="INR">INR</option>
          <option value="AUD">AUD</option>
          <option value="CAD">CAD</option>
          <option value="CNY">CNY</option>
        </select>
        <div className="relative rounded-md shadow-sm w-3/4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
              {getCurrencySymbol(formData.currency)}
            </span>
          </div>
          <input
            type="number"
            id="targetPrice"
            className={`form-input pl-7 w-full ${hasError("targetPrice") ? "border-destructive-500" : ""}`}
            value={formData.targetprice || ""}
            onChange={(e) => setFormData({ ...formData, targetprice: Number(e.target.value) || null })}
          />
        </div>
      </div>
      {hasError("targetPrice") && <ErrorMessage message={getErrorMessage("targetPrice")} />}
    </div>

    {/* Required Documents */}
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("Required Documents")} <span className="text-destructive-500">*</span>
      </label>
      <Select
        isMulti
        options={requiredDocumentOptions}
        value={(JSON.parse(formData.requireddocuments || "[]") as { name: string }[]).map((val) => ({
          label: val.name,
          value: val.name,
        }))}
        onChange={(selected: readonly Option[]) => {
          const documents = selected.map((opt) => ({ name: opt.value }));
          setFormData({
            ...formData,
            requireddocuments: JSON.stringify(documents),
          });
        }}
        menuPortalTarget={document.body}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }}
      />
      {hasError("requireddocuments") && <ErrorMessage message={getErrorMessage("requireddocuments")} />}
    </div>

    {/* Image Uploader (Using Step 2 Logic) */}
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t("productImages")}
      </label>
      <FileUploader
        accept="image/*"
        type="image"
        uploadedFiles={formData.productImages}
        onFilesUploaded={handleImagesUploaded}
        onFileRemoved={handleImageRemoved}
      />
      {hasError("productImages") && <ErrorMessage message={getErrorMessage("productImages")} />}
    </div>
  </div>
)}
</div>
</div>

{/* Footer with Navigation Buttons */}
<div className="w-full bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 flex justify-between items-center">
  <button
    type="button"
    className="btn-secondary btn-md active-scale"
    onClick={handleSaveDraft}
    disabled={isLaunched}
  >
    {t("saveDraft")}
  </button>

  <div>
    {currentStep > 1 && (
      <button
        type="button"
        className="btn-secondary btn-md mr-2 active-scale"
        onClick={handlePrevious}
        disabled={isLaunched}
      >
        {t("previous")}
      </button>
    )}

    {(
      // Show "Next" for reverse on steps 1–5 and 7
      (formData.auctionType === "reverse" && (currentStep < 6 || currentStep === 7)) ||
      // Show "Next" for normal auctions on steps 1–5
      (formData.auctionType !== "reverse" && currentStep < 6)
    ) ? (
      <button
        type="button"
        className="btn-primary btn-md active-scale"
        onClick={handleNext}
        disabled={isLaunched}
      >
        {
          (formData.auctionType === "reverse" && currentStep === 5) ||
          (formData.auctionType !== "reverse" && currentStep === 5)
            ? t("review")
            : t("next")
        }
      </button>
    ) : (
      // Show "Launch" on step 6 for both types
      <button
        type="button"
        className="btn-primary btn-md active-scale"
        onClick={handleLaunchAuction}
        disabled={isLaunched}
      >
        {t("launchAuction")}
      </button>
    )}
  </div>
</div>

        {/* Launch Confirmation */}
        {isLaunched && (
          <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-md shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-corporate-500 dark:text-corporate-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
                {t("auctionLaunched")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-6">{t("auctionLaunchedSuccessfully")}</p>
              <div className="flex justify-center">
                <button type="button" className="btn-primary btn-md active-scale" onClick={handleGoToDashboard}>
                  {t("goToDashboard")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-md shadow-lg">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">{t("confirmDeletion")}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("areYouSureRemove")} <b>{deletionInfo.name}</b> {t("fromParticipantList")}
              </p>
              <div className="mt-6 flex justify-end">
                <button type="button" className="btn-secondary btn-md mr-2 active-scale" onClick={handleCancelDelete}>
                  {t("cancel")}
                </button>
                <button type="button" className="btn-destructive btn-md active-scale" onClick={handleConfirmDelete}>
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuctionBuilderWizard() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en")

  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language)
  }

  return (
    <I18nProvider language={currentLanguage}>
      <AuctionWizardContent language={currentLanguage} onLanguageChange={handleLanguageChange} />
    </I18nProvider>
  )
}
