export interface AssessmentItem {
  id: string;
  prompt: string;
  correct: any;
  metadata?: Record<string, any>;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  type: string;
  score: number;
  theta: number;
  items: AssessmentItem[];
  createdAt: string;
}
