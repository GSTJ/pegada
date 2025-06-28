"use client";

const GlobalError = ({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  return (
    <html>
      <body>
        <section className="bg-white dark:bg-gray-900 min-h-screen flex items-center">
          <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
            <div className="mx-auto max-w-screen-sm text-center gap-4">
              <h1 className="text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">
                500
              </h1>
              <p className="mb-4 text-2xl tracking-tight font-bold text-gray-900 md:text-3xl">
                Something went wrong
              </p>
              <p className="text-lg font-light text-gray-500 dark:text-gray-400">
                We encountered an error. Please try again later.
              </p>
              <button
                onClick={() => reset()}
                className="inline-flex text-white bg-primary hover:scale-105 transition-all focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-primary-900 my-4"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
};

export default GlobalError;
