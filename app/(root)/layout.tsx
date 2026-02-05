import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";

import { auth } from "@clerk/nextjs/server";

const Layout = async ({ children }: { children: ReactNode }) => {
  const { userId } = await auth();
  console.log("Layout Auth Check - UserId:", userId);
  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">InterviewGenie</h2>
        </Link>
        
        <UserButton afterSignOutUrl="/sign-in" />
      </nav>

      {children}
    </div>
  );
};

export default Layout;
