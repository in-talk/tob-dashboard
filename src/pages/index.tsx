import { Toaster } from "@/components/ui/toaster";
import CreateDocument from "@/components/CreateDocument";
import DocumentList from "@/components/DocumentList";

export default function Home() {
  return (
    <div className="max-w-7xl flex flex-col gap-10 mx-auto p-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <CreateDocument />
      </div>
      <DocumentList />
      <Toaster />
    </div>
  );
}
