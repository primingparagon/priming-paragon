export interface TeachingMethod {
  id: string;
  name: string;
  version: string;
  metadata: Record<string, any>;
  rawSource?: string;
  createdBy?: string;
  createdAt: string;
}
