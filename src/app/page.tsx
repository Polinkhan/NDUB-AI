import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat/chat-app";
import { hasPortalSession } from "@/lib/auth/session";

export default async function Home() {
  if (!(await hasPortalSession())) redirect("/login");
  return <ChatApp />;
}
