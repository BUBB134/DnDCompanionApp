export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f1e5] p-6 text-[#17161f]">
      <div className="w-full max-w-sm rounded-lg border border-[#17161f]/15 bg-white p-5 shadow-sm">
        <div className="h-3 w-24 rounded-full bg-[#c3943e]/40" />
        <div className="mt-5 h-7 w-3/4 rounded-md bg-[#17161f]/10" />
        <div className="mt-3 h-4 w-full rounded-md bg-[#17161f]/10" />
        <div className="mt-2 h-4 w-5/6 rounded-md bg-[#17161f]/10" />
      </div>
    </main>
  );
}

