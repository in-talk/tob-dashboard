export type WeirdCase = {
  id: string;
  input: string;
  output: string;
  category: string;
  active: boolean;
};

export type TypoCorrection = {
  id: string;
  pattern: string;
  correction: string;
  active: boolean;
};

export type NonAgePattern = {
  id: string;
  text: string;
  classification: "NO" | "UNSURE";
  active: boolean;
};

export type AgeUnsureKeyword = {
  id: string;
  keyword: string;
  label: "DNC" | "AH" | "NI";
  active: boolean;
};
