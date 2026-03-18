import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import MobileBlock from "@/components/MobileBlock";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <MobileBlock />
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
