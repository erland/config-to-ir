import { Evidence } from "../parse/types";

export type FactEntity = {
  id: string;
  type: string;
  name: string;
  classifierKind?: string;
  stereotypeId?: string;
  tags: Record<string, string>;
  evidence: Evidence[];
};

export type FactGraph = {
  entities: FactEntity[];
};
