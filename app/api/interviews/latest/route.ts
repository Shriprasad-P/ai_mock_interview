import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { getLatestInterviewByUserId } from "@/lib/actions/general.action";

export async function GET() {
  noStore();

  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be signed in." },
        { status: 401 }
      );
    }

    const interview = await getLatestInterviewByUserId(user.id);
    return NextResponse.json({ success: true, interview });
  } catch (error) {
    console.error("Latest interview API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load latest interview.",
      },
      { status: 500 }
    );
  }
}

