import { User } from "@/types/user";
import { Calendar, Edit, IdCard, MoreVertical } from "lucide-react";
import React from "react";
import useSWR from "swr";
import CreateUser from "./CreateUser";
import { usersComponentData } from "@/constants";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Users() {
  const {
    data: users,
    error,
    isLoading,
  } = useSWR<User[]>("/api/get-users", fetcher);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full bg-white dark:bg-sidebar">
        <div className="relative w-12 h-12 top-[0px]">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>{usersComponentData.error}</div>;

  return (
    <>
      <div className="flex justify-end items-center my-2">
        <CreateUser />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {users?.map((user) => (
          <div
            key={user.id}
            className="bg-muted/50 shadow-lg dark:bg-sidebar rounded-xl p-6 border hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="text-dark dark:text-white font-semibold text-lg">
                    {user.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark dark:text-gray-400 flex items-center">
                  <IdCard className="h-4 w-4 mr-1" />
                  {usersComponentData.labels.clientId}
                </span>
                {/* <span className="text-dark dark:text-white font-bold">
                  {user.client_id
                    ? user.client_id
                    : usersComponentData.labels.missingClientId}
                </span> */}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {usersComponentData.labels.lastActive}
                </span>
                <span className="text-dark dark:text-white">
                  {usersComponentData.labels.lastActiveFallback}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              {/* <button
                onClick={() => router.push(`/client/${user.client_id}`)}
                disabled={!user.client_id}
                title={
                  !user.client_id
                    ? usersComponentData.actions.missingClientIdTooltip
                    : ""
                }
                className={cn(
                  "flex-1 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2",
                  !user?.client_id
                    ? "bg-gray-400 cursor-not-allowed"
                    : " bg-gradient-to-br from-blue-600 to-purple-600 "
                )}
              >
                <Eye className="h-4 w-4" />
                <span>{usersComponentData.actions.viewDetails}</span>
              </button> */}
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center">
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Users;