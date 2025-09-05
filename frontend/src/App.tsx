export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 shadow p-8 bg-white">
        <h1 className="text-3xl font-bold tracking-tight text-gray-700">
          React + TypeScript + Tailwind
        </h1>
        <p className="mt-2 text-gray-400">You’re all set up! 🎉</p>

        <button
          className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium 
                     hover:bg-indigo-500 active:scale-95 transition"
          onClick={() => alert("Tailwind is working!")}
        >
          Test Button
        </button>
      </div>
    </main>
  );
}
