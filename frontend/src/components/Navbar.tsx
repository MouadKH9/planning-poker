import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-xl font-bold">
          <a href="/">Planning Poker</a>
        </div>
        <ul className="flex items-center gap-4">
          <li>
            <a
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Home
            </a>
          </li>
          {isAuthenticated && (
            <li>
              <a
                href="/session-history"
                className="text-blue-600 hover:underline font-semibold"
              >
                Session History
              </a>
            </li>
          )}
          <li>
            <a
              href="/about"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              About
            </a>
          </li>
          <li>
            <a
              href="/contact"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
