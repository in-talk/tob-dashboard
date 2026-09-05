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
  label: "DNC" | "AH" | "NI" | "IDL" | "CGM-NQ1";
  active: boolean;
};

export type PositiveNegativePattern = {
  id: string;
  text: string;
  label: "YES" | "NO";
  active: boolean;
};
