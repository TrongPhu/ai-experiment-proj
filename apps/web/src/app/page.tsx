import { Suspense } from "react";
import { ChatWorkspace } from "./components/chat-workspace";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ChatWorkspace />
    </Suspense>
  );
}
