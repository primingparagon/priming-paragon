export interface AssessmentItem {
  id: string;
  prompt: string;
  correct: any;
  metadata?: Record<string, any>;
}
