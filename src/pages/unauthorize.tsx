import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";

export default function UnauthorizedPage() {
  const router=useRouter()
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className=" flex flex-col items-center gap-2">
        <h1 className="text-lg font-bold">401 - Unauthorized</h1>
        <p>Please log in to access this page.</p>
        <Button variant='default' onClick={()=>router.push('/signin')}>Login</Button>
        </div>
      </main>
    )
  }