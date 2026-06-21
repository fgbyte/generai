import { Link, useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { FeedbackModal } from "@/components/modals/feedback-modal";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          {session.user.name}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
              <MessageSquare className="size-4 mr-2" />
              Send feedback
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      navigate({
                        to: "/",
                      });
                    },
                  },
                });
              }}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
