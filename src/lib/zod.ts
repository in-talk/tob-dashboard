import { z } from "zod";

export const labelsSchema = z.object({
    label: z.string(),
    keywords: z.array(z.string()).optional(),
    active_turns: z.array(z.number()).optional(),
    file_name: z.string(),
    check_on_all_turns: z.boolean().optional(),
});

export type LabelsSchema = z.infer<typeof labelsSchema>;