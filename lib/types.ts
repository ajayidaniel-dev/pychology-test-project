export interface Scale {
  id: string
  name: string
  description: string
  totalItems: number
  scoringType: "sum" | "average" | "weighted"
  responseFormat: "numeric" | "text" | "mixed"
  minScore: number
  maxScore: number
  expectedRange?: string
  createdBy?: string
  isPublic: boolean
  isVerified: boolean
  citation?: string
  instructions?: string
  interpretationRanges: InterpretationRange[]
}

export interface ScaleItem {
  id: string
  scaleId: string
  itemNumber: number
  questionText: string
  responseType: "likert" | "binary" | "multiple_choice"
  isReverseCoded: boolean
}

export interface ResponseMapping {
  id: string
  scaleItemId: string
  textResponse: string
  numericValue: number
  aliases: string[]
}

export interface InterpretationRange {
  id: string
  scaleId: string
  minScore: number
  maxScore: number
  severity: string
  description: string
  color: string
}

export interface UploadSession {
  id: string
  fileName: string
  uploadedAt: Date
  totalResponses: number
  processedResponses: number
  selectedScaleId: string
  status: "uploading" | "processing" | "completed" | "error"
  results?: ProcessedResult[]
}

export interface ProcessedResult {
  id: string
  sessionId: string
  participantId: string
  responses: { [itemNumber: number]: string }
  scores: { [itemNumber: number]: number }
  totalScore: number
  interpretation: string
  severity: string
  processingErrors: string[]
}

export interface FileUploadData {
  participantId: string
  responses: { [key: string]: string }
}

export interface FormatDetectionResult {
  detectedFormat: "numeric" | "text" | "mixed"
  confidence: number
  numericResponses: number
  textResponses: number
  totalResponses: number
  sampleResponses: string[]
  validationErrors: string[]
  recommendations: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestedMappings?: ResponseMapping[]
}
