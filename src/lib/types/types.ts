// src/types/types.ts
export type Exercice = {
  uuid: string;
  titre: string;
  theme: string[];
  niveau: string;
  metadata: Metadata;
  contenu: ContenuElement[];
  preview: string;
};

export type Metadata = {
  // Champs originaux
  auteur?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  organisation?: string;
  tags?: string[];
  
  // Nouveaux champs pour Exo7
  exo7id?: string;
  hasIndication?: boolean;
  hasCorrection?: boolean;
  youtube?: string;
  chapitre?: string;
  sousChapitre?: string;
};

export type ContenuElement = {
  id: string;
  type: "description" | "question" | "reponse" | "indication" | "code";
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

// Types utilitaires pour la validation
export type ContenuType = ContenuElement["type"];

export type GraphicElement = {
  latex: string;
  svg: string;
  caption?: string;
};