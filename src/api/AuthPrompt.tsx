import { useState } from "react";

interface AuthPromptProps {
  onAuth: (token: string) => void;
}

export function AuthPrompt({ onAuth }: AuthPromptProps) {
  const [key, setKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onAuth(key.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-4">
        <label htmlFor="api-key" className="mb-2 block text-sm text-muted">
          API Key
        </label>
        <input
          id="api-key"
          type="password"
          placeholder="Enter API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mb-4 w-full bg-raised px-3 py-2 text-primary outline-none
                     focus-visible:ring-2 focus-visible:ring-lavender"
        />
        <button
          type="submit"
          className="w-full bg-raised px-4 py-2 text-bright
                     hover:bg-surface focus-visible:ring-2 focus-visible:ring-lavender"
        >
          Connect
        </button>
      </form>
    </div>
  );
}
