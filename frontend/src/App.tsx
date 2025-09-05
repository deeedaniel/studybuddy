import { useState } from "react";

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = async () => {
    try {
      const response = await fetch(
        "http://localhost:4000/api/v1/canvas/courses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey, phoneNumber }),
        }
      );
      const data = await response.json();
      console.log("Response from backend:", data);
      alert("Courses fetched! Check the console.");
    } catch (error) {
      console.error("Error sending data to backend:", error);
      alert("Failed to fetch courses. See console for details.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 shadow p-8 bg-white">
        <h1 className="text-3xl font-bold tracking-tight text-gray-700">
          StudyBuddy
        </h1>
        <p className="mt-2 text-gray-400">
          Enter your Canvas API key and phone number.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700"
            >
              Canvas API Key
            </label>
            <input
              type="text"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your API key"
            />
          </div>
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your phone number"
            />
          </div>
        </div>

        <button
          className="mt-6 w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-500 active:scale-95 transition"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </main>
  );
}
