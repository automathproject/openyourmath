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

  // Champs enrichis
  resume?: string;
  competences?: string[];
  concepts_fondamentaux?: string[];
  prerequis?: string[];
  type_exercice?: string;  // QCM, Vrai ou faux, exercice d'application, etc.
  niveau_difficulte?: string;
  mots_cles?: string[];
  temps_estime?: string;
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