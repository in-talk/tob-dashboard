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

export type KeywordMatchType = "word" | "exact" | "regex";

export type LabelKeyword = {
  id: string;
  keyword: string;
  // Any label registered in ai-voice-bot (see LabelDefinition).
  label: string;
  match_type: KeywordMatchType;
  active: boolean;
};

export type LabelDefinition = {
  label: string;
  description: string;
  // Checked on every transcript; a match ends the call instantly.
  early_hangup: boolean;
  // Turns the early-hangup check applies to; null = every turn.
  turns: number[] | null;
};

export type PositiveNegativePattern = {
  id: string;
  text: string;
  label: "YES" | "NO";
  active: boolean;
};
