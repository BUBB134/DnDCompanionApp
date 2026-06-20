export default function CharacterCreateLoading() {
  return (
    <div className="grid gap-5">
      <div className="h-10 w-44 rounded-md bg-[#17161f]/10" />
      <section className="rounded-lg border border-[#17161f]/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="h-44 rounded-xl bg-[#17161f]/10" />
        <div className="mt-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              className="h-10 w-28 shrink-0 rounded-full bg-[#17161f]/10"
              key={index}
            />
          ))}
        </div>
        <div className="mt-6 h-8 w-48 rounded-md bg-[#17161f]/10" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="h-48 rounded-xl bg-[#fff7de]" />
          <div className="h-48 rounded-xl bg-[#e7f5f6]" />
        </div>
      </section>
    </div>
  );
}
