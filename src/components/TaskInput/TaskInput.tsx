import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import "./TaskInput.css";

interface TaskInputProps {
  onAdd: (title: string) => void;
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  };

  return (
    <form className="input-row" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Nueva tarea..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit" className="submit-btn">
        <Check size={14} strokeWidth={2.5} />
      </button>
    </form>
  );
}
