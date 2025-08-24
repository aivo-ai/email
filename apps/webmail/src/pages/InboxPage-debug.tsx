// Debug version of InboxPage to test rendering
export default function InboxPage() {
  return (
    <div className="h-full bg-red-500 text-white p-8">
      <h1 className="text-4xl font-bold">INBOX PAGE - DEBUG</h1>
      <p className="text-2xl mt-4">If you can see this red background, the routing and basic rendering works!</p>
      <div className="mt-8">
        <p>Tailwind classes test:</p>
        <div className="bg-blue-600 text-yellow-300 p-4 rounded-lg mt-2">
          This should be blue with yellow text
        </div>
      </div>
    </div>
  )
}
