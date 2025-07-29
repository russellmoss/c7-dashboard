export const dynamic = 'force-dynamic';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-card-foreground mb-2">Loading...</h1>
        <p className="text-muted-foreground">
          Please wait while we load your content.
        </p>
      </div>
    </div>
  );
} 