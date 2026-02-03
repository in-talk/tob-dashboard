import useSWR from "swr";

export function useClients(userId: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        userId ? `user-${userId}` : null,
        () =>
            fetch(`/api/fetchClientsByUser?user_id=${userId}`).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch clients");
                return res.json();
            }),
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    return {
        clients: data?.clients ?? [],
        isLoading,
        error,
        mutate
    };
}
