import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 py-10">
      <div className="flex items-center gap-2">
        <Image src="/logo.svg" alt="InterviewGenie Logo" width={48} height={48} />
        <h1 className="text-3xl font-bold text-primary-100">InterviewGenie</h1>
      </div>
      <SignIn />
    </div>
  );
}
