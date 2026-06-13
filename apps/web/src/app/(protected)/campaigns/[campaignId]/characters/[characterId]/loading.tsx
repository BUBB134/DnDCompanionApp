export default function CharacterDetailLoading() {
  return (
    <div className="grid gap-5">
      <section className="h-48 rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <div className="grid gap-5">
          <div className="h-40 rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
          <div className="h-80 rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
        </div>
        <div className="h-56 rounded-lg border border-[#17161f]/10 bg-white shadow-sm" />
      </section>
    </div>
  );
}
