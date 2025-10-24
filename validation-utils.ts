// Define validation types
export type ValidationError = {
  field: string
  message: string
}

export type StepValidation = {
  isValid: boolean
  errors: ValidationError[]
}

// Validate Step 1: Auction Type
export function validateStep1(auctionType: string, auctionSubType: string): StepValidation {
  const errors: ValidationError[] = []

  if (!auctionType) {
    errors.push({
      field: "auctionType",
      message: "Please select an auction type",
    })
  }

  if (!auctionSubType) {
    errors.push({
      field: "auctionSubType",
      message: "Please select an auction sub-type",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validate Step 2: Bidding Parameters (updated signature)
export function validateStep2(
  startPrice: number,
  minimumIncrement: number,
  days: number,
  hours: number,
  minutes: number,
  launchType: string,
  scheduledStart: string,
  bidExtension?: boolean,
  bidExtensionTime?: number,
  auctionSubType?: string,         // 👈 ADD THIS
  productQuantity?: number         // 👈 AND THIS
): StepValidation {

  const errors: ValidationError[] = []

  if (startPrice <= 0) {
    errors.push({
      field: "startPrice",
      message: "Start price must be greater than zero",
    })
  }

  if (minimumIncrement <= 0) {
    errors.push({
      field: "minimumIncrement",
      message: "Minimum increment must be greater than zero",
    })
  }

if (auctionSubType !== "yankee" && minimumIncrement <= 0) {
  errors.push({
    field: "minimumIncrement",
    message: "Minimum increment must be greater than zero",
  });
}


  // Validate scheduled start time if launch type is scheduled
  if (launchType === "scheduled") {
    const scheduledDate = new Date(scheduledStart)
    const now = new Date()

    if (isNaN(scheduledDate.getTime())) {
      errors.push({
        field: "scheduledStart",
        message: "Please enter a valid date and time",
      })
    } else if (scheduledDate <= now) {
      errors.push({
        field: "scheduledStart",
        message: "Scheduled start time must be in the future",
      })
    }
  }

  // Validate bid extension settings
  if (bidExtension && bidExtensionTime && bidExtensionTime <= 0) {
    errors.push({
      field: "bidExtensionTime",
      message: "Bid extension time must be greater than zero",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validate Step 3: Product Details
export function validateStep3(productName: string, productDescription: string,  auctionSubType?: string,
  productQuantity?: number  ): StepValidation {
  const errors: ValidationError[] = []

  if (!productName.trim()) {
    errors.push({
      field: "productName",
      message: "Product name is required",
    })
  } else if (productName.trim().length < 3) {
    errors.push({
      field: "productName",
      message: "Product name must be at least 3 characters",
    })
  }
  if (auctionSubType === "yankee") {
  if (productQuantity == null || productQuantity <= 0) {
    errors.push({
      field: "productQuantity",
      message: "Product quantity is required for Yankee auctions",
    });
  }
  if (productQuantity && productQuantity < 2) {
    errors.push({
      field: "productQuantity",
      message: "For a single item auction, please select other subtypes like English or Dutch in the auction type",
    });
  }
}

  if (!productDescription.trim()) {
    errors.push({
      field: "productDescription",
      message: "Product description is required",
    })
  } else if (productDescription.trim().length < 10) {
    errors.push({
      field: "productDescription",
      message: "Product description must be at least 10 characters",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validate Step 4: Participation Rules
export function validateStep4(participationType: string, participantEmails: string[]): StepValidation {
  const errors: ValidationError[] = []

  if (!participationType) {
    errors.push({
      field: "participationType",
      message: "Please select a participation type",
    })
  }

  // If invite-only is selected, ensure at least one email is added
  if (participationType === "invite-only" && participantEmails.length === 0) {
    errors.push({
      field: "participantEmails",
      message: "Please add at least one participant email",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validate Step 5: Terms & Conditions
export function validateStep5(termsAndConditions: any[]): StepValidation {
  const errors: ValidationError[] = []

  // If there are terms and conditions, check if any required ones are missing content
  if (termsAndConditions.length > 0) {
    const invalidTerms = termsAndConditions.filter(
      (term) => term.required && (!term.title.trim() || !term.content.trim()),
    )

    if (invalidTerms.length > 0) {
      errors.push({
        field: "termsAndConditions",
        message: "Please complete all required terms and conditions",
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
// Validate Step 7: Reverse Auction Details
export function validateStep7(targetPrice: number, requireddocuments: string): StepValidation {
  const errors: ValidationError[] = []

  // Target price must be a positive number
  if (isNaN(targetPrice) || targetPrice <= 0) {
    errors.push({
      field: "targetPrice",
      message: "Target price must be a number greater than zero",
    })
  }

  // Required documents array must contain at least one entry
if (!requireddocuments || requireddocuments.trim() === "") {
  errors.push({
    field: "requireddocuments",
    message: "Please select at least one required document",
  });
}

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
