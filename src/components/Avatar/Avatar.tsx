import { User } from "lucide-react";
import "./Avatar.css";

interface AvatarProps {
  url?: string | null;
  name?: string;
  onClick?: () => void;
}

export function Avatar({ url, name, onClick }: AvatarProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp className="avatar" onClick={onClick} type={onClick ? "button" : undefined}>
      {url ? (
        <img src={url} alt={name || "Avatar"} className="avatar-img" />
      ) : (
        <User size={16} />
      )}
    </Comp>
  );
}
