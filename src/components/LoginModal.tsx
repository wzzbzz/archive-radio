import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X } from 'lucide-react';

export function LoginModal() {
  const { showLoginModal, setShowLoginModal, signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-archive-surface border border-archive-muted rounded-xl p-8 w-full max-w-md relative">
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6">Admin Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-archive-black border border-archive-muted rounded-lg focus:border-archive-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-archive-black border border-archive-muted rounded-lg focus:border-archive-accent focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-archive-accent text-black font-bold py-3 rounded-lg hover:bg-archive-accent/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
