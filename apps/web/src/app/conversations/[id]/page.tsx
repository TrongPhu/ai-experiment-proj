import { Suspense } from "react";
import { ChatWorkspace } from "../../components/chat-workspace";

export default async function ConversationPage({
  params,
}: PageProps<"/conversations/[id]">) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <ChatWorkspace initialConversationId={id} />
    </Suspense>
  );
}
