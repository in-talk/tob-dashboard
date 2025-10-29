export const signInPageData = {
  heading: "Sign in to your account",
  emailPlaceholder: "Email",
  passwordPlaceholder: "Password",
  signInButton: "Sign In",
  signingIn: "Signing in....",
  protectedBy: "Protected by reCAPTCHA and subject to Privacy Policy",
  welcomeBack: " Welcome back! Please sign in to continue",
  errors: {
    recaptchaRequired: "Please complete the reCAPTCHA verification",
    recaptchaLoad: "reCAPTCHA failed to load. Please refresh the page.",
    recaptchaExpired: "reCAPTCHA expired. Please verify again.",
    recaptchaConfig: "reCAPTCHA is not properly configured",
    recaptchaFailed: "reCAPTCHA verification failed. Please try again.",
    invalidCredentials: "Invalid email or password",
    unexpected: "An unexpected error occurred",
  },
  configError: {
    title: "Configuration Error",
    description:
      "reCAPTCHA site key is missing. Please check your environment variables.",
  },
  inputLabel: {
    email: "Email address",
    password: "Password",
  },
  alt: {
    logo: "logo",
    login: "login",
  },
};

export const unauthorizedPageData = {
  heading: "401 - Unauthorized",
  description: "Please log in to access this page.",
  loginButtonText: "Login",
};

export const usersPageData = {
  title: "InTalk Dashboard - Smart Customer Service Management",
  heading: "Users",
};

export const keywordFinderPageData = {
  transcriptPlaceholder: "Enter your transcript here...",
  turnPlaceholder: "Turn",
  campaignSelectPlaceholder: "Select Campaign",
  findKeywordButton: "Find Keyword",
  resultHeading: "Result",
  processingText: "Processing ...",
  errorPrefix: "Error:",
  noResultsHeading: "No results yet",
  noResultsDescription:
    "Enter a transcript and click `Find Keyword` to see results here.",
};

export const appPageData = {
  seoMetaData: {
    title:
      "InTalk AI Agent Call Center Dashboard - Smart Customer Service Management",
    description:
      "Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics and real-time insights.",
    keywords:
      "AI call center, customer service dashboard, call center analytics, agent performance, customer support, artificial intelligence, call monitoring, service metrics, contact center management",
    robots: "index, follow",
    contentType: "text/html; charset=utf-8",
    language: "English",
    author: "Your Company Name",
    viewport: "width=device-width, initial-scale=1.0",
    og: {
      type: "website",
      url: "https://www.intalk.ai/",
      title:
        "AI Agent Call Center Dashboard - Smart Customer Service Management",
      description:
        "Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance, track call metrics, and optimize customer interactions with intelligent analytics.",
    },
    twitter: {
      card: "summary_large_image",
      url: "https://www.intalk.ai/",
      title:
        "AI Agent Call Center Dashboard - Smart Customer Service Management",
      description:
        "Advanced AI-powered call center dashboard for managing customer service operations. Monitor agent performance and optimize customer interactions.",
    },
    themeColor: "#ffffff",
    msTileColor: "#ffffff",
    appName: "InTalk AI Call Center Dashboard",
  },
  breadcrumb: {
    first: "Building Your Application",
    current: "Dashboard",
  },
};

export const usersListData = {
  error: "Failed to load users.",
  emptyState: "No User in database!",
};

export const usersComponentData = {
  error: "Failed to load users.",
  labels: {
    clientId: "Client ID",
    lastActive: "Last Active",
    missingClientId: "Missing",
    role: "Role",
    lastActiveFallback: "an hour ago",
  },
  actions: {
    viewDetails: "View Details",
    missingClientIdTooltip: "Client Id missing",
  },
};
export const updateDocumentText = {
  dialog: {
    description: "Update document form",
    title: "Update Document",
    trigger: "Edit",
  },
  submitButton: {
    update: "Update",
  },
  toast: {
    success: "Document updated successfully.",
    error: "Failed to update document",
  },
};

export const updateDocumentFormData = {
  labels: {
    label: "Label",
    fileName: "File name",
    activeTurns: "Active Turns (comma-separated)",
    uniqueKeywords: "Unique Keywords",
    checkOnAllTurns: "Check on all turns",
  },
  placeholders: {
    activeTurns: "Enter numbers separated by commas, e.g., 1, 2, 3",
    uniqueKeywords: "Enter unique words separated by commas, e.g., foo,bar",
  },
  messages: {
    error: "An error occurred. Please try again.",
  },
  buttons: {
    submit: "Submit",
    loading: "Submitting...",
  },
};

export const editKeywordsData = {
  dialog: {
    trigger: "Edit keywords",
    title: "Add Keywords",
    close: "Close",
  },
  labels: {
    singleKeyword: "Single Keyword Input",
    bulkKeyword: "Bulk Keyword Input",
  },
  placeholders: {
    singleKeyword: "Add keywords and press Enter",
    bulkKeyword: "Add multiple keywords (comma-separated or one per line)",
    search: "Search keywords...",
  },
  buttons: {
    addBulk: "Add Bulk Keywords",
    removeKeywordSuffix: "✕", // shown after each keyword
  },
  toasts: {
    success: "Keywords updated successfully.",
    error: {
      default: "Failed to update keywords",
      unexpected: "An unexpected error occurred",
    },
  },
};
export const documentListData = {
  error: "Failed to load documents.",
  emptyState: "No Document is availabe in database!",
};

export const deleteDocumentData = {
  button: {
    delete: "Delete",
  },
  dialog: {
    title: "Are you absolutely sure?",
    description:
      "This action cannot be undone. This will permanently delete your document from database.",
    cancel: "Cancel",
    confirmDelete: "Delete",
  },
  toast: {
    success: {
      description: "Document deleted successfully.",
    },
    error: {
      title: "Uh oh! Something went wrong.",
      unexpected: "An unexpected error occurred.",
      server: "Unable to connect to the server.",
    },
  },
};

export const deleteClientAlert = {
  button: {
    delete: "Delete",
  },
  dialog: {
    title: "Are you sure?",
    description:
      "This action cannot be undone. This will permanently delete client from database.",
    cancel: "Cancel",
    confirmDelete: "Delete",
  },
  toast: {
    success: {
      description: "Client deleted successfully.",
    },
    error: {
      title: "Uh oh! Something went wrong.",
      unexpected: "An unexpected error occurred.",
      server: "Unable to connect to the server.",
    },
  },
};

export const deleteAgentAlert = {
  button: {
    delete: "Delete",
  },
  dialog: {
    title: "Are you sure?",
    description:
      "This action cannot be undone. This will permanently delete agent from database.",
    cancel: "Cancel",
    confirmDelete: "Delete",
  },
  toast: {
    success: {
      description: "Agent deleted successfully.",
    },
    error: {
      title: "Uh oh! Something went wrong.",
      unexpected: "An unexpected error occurred.",
      server: "Unable to connect to the server.",
    },
  },
};

export const createUserData = {
  trigger: {
    button: "Create User",
  },
  dialog: {
    title: "Create New User",
  },
  message: {
    success: "User created successfully",
    error: "Failed to create user",
  },
  form: {
    email: {
      label: "Email",
      required: "Email is required",
    },
    password: {
      label: "Password",
      required: "Password is required",
      minLength: "Password must be at least 6 characters long",
    },
    name: {
      label: "Name",
      required: "Name is required",
    },
    role: {
      label: "Role",
      options: {
        admin: "Admin",
        user: "User",
      },
    },
    clientId: {
      label: "Client Id",
      required: "Client ID is required",
    },
  },
  button: {
    submit: "Create User",
    submitting: "Creating...",
  },
};

export const createClientData = {
  trigger: {
    button: "Create Client",
  },
  dialog: {
    title: "Create New Client",
  },
  message: {
    success: "Client created successfully",
    error: "Failed to create client",
  },
  form: {
    email: {
      label: "Email",
      required: "Email is required",
    },
    password: {
      label: "Password",
      required: "Password is required",
      minLength: "Password must be at least 6 characters long",
    },
    name: {
      label: "Name",
      required: "Name is required",
    },
    role: {
      label: "Role",
      options: {
        admin: "Admin",
        user: "User",
      },
    },
    clientId: {
      label: "Client Id",
      required: "Client ID is required",
    },
  },
  button: {
    submit: "Create Client",
    submitting: "Creating...",
  },
};

export const createAgentData = {
  trigger: {
    button: "Create Agent",
  },
  dialog: {
    title: "Create New Agent",
  },
  message: {
    success: "Agent created successfully",
    error: "Failed to create agent",
  },
  form: {
    name: {
      label: "Agent Name",
      required: "Agent name is required",
    },

    agentId: {
      label: "Agent Id",
      required: "Agent ID is required",
    },
  },
  button: {
    submit: "Create Agent",
    submitting: "Creating...",
  },
};

export const createDocumentFormData = {
  form: {
    label: {
      label: "Label",
      required: "Label is required",
    },
    fileName: {
      label: "File name",
      required: "File name is required",
    },
    activeTurns: {
      label: "Active Turns (comma-separated)",
      placeholder: "Enter numbers separated by commas, e.g., 1, 2, 3",
    },
    checkOnAllTurns: {
      label: "Check on all turns",
    },
    uniqueKeywords: {
      label: "Unique Keywords",
      placeholder: "Enter unique words (comma-separated or one per line)",
    },
  },
  keywordsDialog: {
    trigger: "Add Keywords",
    title: "Add Keywords",
    singleInput: {
      label: "Single Keyword Input",
      placeholder: "Press Enter to add keyword",
    },
    bulkInput: {
      label: "Bulk Keyword Input",
      placeholder: "Comma-separated or one per line",
      button: "Add Bulk Keywords",
    },
    search: {
      placeholder: "Search keywords...",
    },
    saveButton: "Save",
    clearAll: {
      confirm: "Are you sure you want to clear all keywords?",
      button: "Clear All Keywords",
    },
  },
  button: {
    submit: "Create Document",
    saving: "Saving...",
  },
  messages: {
    success: "Document created successfully.",
    error: {
      default: "Failed to create document",
      unexpected: "Unexpected error",
    },
  },
};

export const createDocumentData = {
  triggerButton: "Add Document",
  dialog: {
    title: "Create New Document",
    description:
      "Fill in the form below to create a new document with a label and associated keywords.",
  },
  form: {
    submitButton: "Create",
  },
};

export const clearAllKeywordsAlertData = {
  triggerButton: "Delete All",
  title: "Are you absolutely sure?",
  description:
    "This action cannot be undone. This will permanently delete your document from database.",
  input: {
    placeholder: 'Type " Delete all" to delete all keywords ',
    requiredText: "delete all",
  },
  actions: {
    cancel: "Cancel",
    confirm: "Yes",
  },
};

export const audioProcessorData = {
  title: "Audio File Processor",
  clearAll: "Clear All",

  upload: {
    dropOrClick: "Drop audio files here or click to upload",
    supportedFormats: "Supports WAV and MP3 files up to 100MB",
  },

  files: {
    heading: (count: number) => `Files (${count})`,
    errorIconLabel: "File error",
    completedIconLabel: "File processed",
    removeButton: "Remove file",
  },

  buttons: {
    process: "Process and Download",
    processing: "Processing...",
  },

  status: {
    added: (count: number) => `${count} files added`,
    processing: "Processing files...",
    success: "Processing complete! Files downloaded.",
    error: (msg?: string) => `Error: ${msg ?? "Unknown error occurred"}`,
  },
};

export const gaugeChartText = {
  page: {
    title: "Agent XFER Performance",
    description: "Monitor call transfer performance across your agents",
  },

  agentCard: {
    transferRate: "Transfer Rate",
    xfer: "XFER",
    resolved: "Resolved",
    transferred: "Transferred",
  },

  statuses: {
    outstanding: "Outstanding",
    excellent: "Excellent",
    good: "Good",
    needsAttention: "Needs Attention",
    critical: "Critical",
  },

  progressBar: {
    min: "0%",
    max: "100%",
  },

  summary: {
    title: "Team Summary",
    avgTransferRate: "Average Transfer Rate",
    bestPerformance: "Best Performance",
    needsImprovement: "Needs Improvement",
    totalAgents: "Total Agents",
  },
};

export const agentDispositionReportText = {
  title: "Agent Disposition Report",
  toggle: {
    expand: "Expand",
    collapse: "Collapse",
  },
  table: {
    headers: {
      agentName: "Agent Name",
      totalCalls: "Total Calls",
      xfer: "XFER",
    },
    emptyState: {
      title: "No records found",
      description: "Try adjusting your search or filter criteria",
    },
  },
};
