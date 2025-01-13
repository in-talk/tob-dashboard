import { z } from "zod";

// Document schema
export const documentSchema = z.object({
    label: z.string().min(1, "Label is required"),
    keywords: z.array(z.string()).optional(), // Array of strings for keywords
    active_turns: z
        .array(
            z.object({
                turn_number: z.number().min(1, "Turn number must be at least 1"),
            })
        )
        .optional(), // Array of objects for active_turns
    file_name: z.string().min(1, "File name is required"),
    check_on_all_turns: z.boolean().default(false),
});

export type DocumentSchema = z.infer<typeof documentSchema>;