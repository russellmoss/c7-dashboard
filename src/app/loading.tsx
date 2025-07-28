export const dynamic = 'force-dynamic';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-wine-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Loading...
        </h2>
        <p className="text-gray-600">
          Please wait while we load your dashboard.
        </p>
      </div>
    </div>
  );
} 