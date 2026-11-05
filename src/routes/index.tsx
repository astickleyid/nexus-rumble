import { createFileRoute } from "@tanstack/react-router";
import { Rumble } from "@/components/Rumble";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Rumble />;
}
