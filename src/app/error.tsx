'use client';

export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-6">
          An error occurred while loading this page.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="inline-block bg-wine-600 text-white px-6 py-3 rounded-lg hover:bg-wine-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
} 