"use client";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/types/user";
import useSWR from "swr";
import { usersColumns } from "./DataTable/UsersColumn";
import { DataTable } from "./DataTable/DataTable";



const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersList() {
  const { data: users, error, isLoading } = useSWR<User[]>("/api/get-users", fetcher);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-40 bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>Failed to load users.</div>;

  const usersList = users || [];

  return (
    <div className="space-y-2">
      {usersList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">No User in database!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="container mx-auto py-3 px-[30px]">
                <DataTable columns={usersColumns} data={usersList} />
              </div>
      )}
    </div>
  );
}
