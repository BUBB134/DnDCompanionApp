export default function CharacterListLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <div className="h-3 w-28 rounded-full bg-[#c3943e]/40" />
        <div className="mt-4 h-8 w-3/4 max-w-xl rounded-md bg-[#17161f]/10" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded-md bg-[#17161f]/10" />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="h-[42rem] rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
        <div className="h-[28rem] rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
      </section>
    </div>
  );
}
