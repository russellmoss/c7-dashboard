export const dynamic = 'force-dynamic';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
        <p className="text-gray-600">
          Please wait while we load your content.
        </p>
      </div>
    </div>
  );
} 