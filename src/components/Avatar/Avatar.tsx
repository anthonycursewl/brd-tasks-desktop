import { User } from "lucide-react";
import "./Avatar.css";

interface AvatarProps {
  url?: string | null;
  name?: string;
}

export function Avatar({ url, name }: AvatarProps) {
  if (url) {
    return (
      <div className="avatar">
        <img src={url} alt={name || "Avatar"} className="avatar-img" />
      </div>
    );
  }

  return (
    <div className="avatar">
      <User size={16} />
    </div>
  );
}
