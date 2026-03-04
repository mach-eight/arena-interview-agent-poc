import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Interview Agent</h1>
        <p className="text-gray-600">AI-powered technical interview practice</p>
        <Link
          href="/interview"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Start Interview
        </Link>
      </div>
    </div>
  );
}
