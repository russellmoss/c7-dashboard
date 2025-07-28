export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-wine-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-block bg-wine-600 text-white px-6 py-3 rounded-lg hover:bg-wine-700 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
} 