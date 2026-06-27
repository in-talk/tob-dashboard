export type labels = {
    _id: string;
    label: string;
    keywords: string[];
    active_turns: number[];
    unique_words: string[];
    file_name: string;
    check_on_all_turns: boolean;
    // BGE-M3 semantic-classifier fields. Optional — present only on
    // docs where the user has filled them in via the label modal.
    description?: string;
    samples?: string[];
}