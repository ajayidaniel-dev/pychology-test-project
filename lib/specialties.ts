import type { Specialty } from '@prisma/client'

export const SPECIALTIES: Specialty[] = [
  'ABNORMAL',
  'BIOPSYCHOLOGY',
  'SOCIAL',
  'COGNITIVE',
  'DEVELOPMENTAL',
  'PERSONALITY',
  'FORENSIC',
  'INDUSTRIAL_ORGANIZATIONAL',
  'CLINICAL',
  'COUNSELLING',
  'OTHER',
]

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  ABNORMAL: 'Abnormal',
  BIOPSYCHOLOGY: 'Biopsychology',
  SOCIAL: 'Social',
  COGNITIVE: 'Cognitive',
  DEVELOPMENTAL: 'Developmental',
  PERSONALITY: 'Personality',
  FORENSIC: 'Forensic',
  INDUSTRIAL_ORGANIZATIONAL: 'Industrial-Organizational',
  CLINICAL: 'Clinical',
  COUNSELLING: 'Counselling',
  OTHER: 'Other',
}

export function isSpecialty(value: string): value is Specialty {
  return (SPECIALTIES as string[]).includes(value)
}
