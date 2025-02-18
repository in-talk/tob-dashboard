import { z } from "zod";

export const labelsSchema = z.object({
  label: z.string(),
  keywords: z.array(z.string()).optional(),
  active_turns: z
    .union([z.string(), z.array(z.number())])
    .transform((val) => {
      if (typeof val === "string") {
        return val
          .split(",")
          .map((num) => num.trim())
          .filter((num) => num !== "" && !isNaN(Number(num))) // Only valid numbers
          .map(Number);
      }
      return val;
    })
    .optional(),
  unique_words: z.array(z.string()).optional(),
  file_name: z.string(),
  check_on_all_turns: z.boolean().optional(),
});

export type LabelsSchema = z.infer<typeof labelsSchema>;
