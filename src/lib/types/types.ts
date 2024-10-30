// src/types/types.ts  à utiliser dans le nouveau format
export type Exercice = {
    uuid: string;
    titre: string;
    theme: string[];
    niveau: string;
    metadata: Metadata;
    contenu: ContenuElement[];
  };
  
  export type Metadata = {
    auteur?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: string;
    organisation?: string;
    tags?: string[];
  };
  
  export type ContenuElement = {
    id: string;
    type: "description" | "question" | "reponse";
    value: {
      latex?: string;
      html?: string;
      graphic?: {
        latex: string; 
        svg: string;
        caption?: string;
      };
      code?: string;
    };
  };
  