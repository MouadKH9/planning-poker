import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ParticipantAvatarProps {
  name: string;
  className?: string;
}

export function ParticipantAvatar({
  name,
  className = "h-8 w-8",
}: ParticipantAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback>{name?.charAt(0) ?? "Avatar"}</AvatarFallback>
    </Avatar>
  );
}
