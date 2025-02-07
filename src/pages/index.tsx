import CreateDocument from "@/components/CreateDocument";
import DocumentList from "@/components/DocumentList";
export default function Home() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex justify-between items-center my-2">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <CreateDocument />
        </div>

        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
          <DocumentList />
        </div>
      </div>
    </>
  );
}
