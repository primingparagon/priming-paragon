export interface AccessibilityProfile {
  screenReaderEnabled?: boolean;
  preferredHighlightColor?: string;
  maxVisualElements?: number;
}

export interface Persona {
  tone: string;
  scaffolding: string;
  challenge: string;
  modalPref: string[];
}

export interface StudentProfile {
  userId: string;
  declaredGrade?: string;
  persona: Persona;
  accessibility?: AccessibilityProfile;
  iepFlags?: string[];
}
