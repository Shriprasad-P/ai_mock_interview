import Agent from "@/components/Agent";
import { currentUser } from "@clerk/nextjs/server";

const Page = async () => {
  const user = await currentUser();
  console.log("Interview Page User:", user?.id, user?.firstName);

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={`${user?.firstName} ${user?.lastName}`}
        userId={user?.id}
        type="generate"
      />
    </>
  );
};

export default Page;
