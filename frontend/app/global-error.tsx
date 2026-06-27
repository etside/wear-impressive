'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center px-4">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Something went wrong</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              A critical error occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
