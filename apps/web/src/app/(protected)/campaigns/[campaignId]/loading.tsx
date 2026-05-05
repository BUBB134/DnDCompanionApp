export default function CampaignDashboardLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <div className="h-3 w-28 rounded-full bg-[#c3943e]/40" />
        <div className="mt-4 h-8 w-3/4 max-w-xl rounded-md bg-[#17161f]/10" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded-md bg-[#17161f]/10" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="min-h-[360px] rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="h-3 w-32 rounded-full bg-[#1f6f78]/25" />
          <div className="mt-4 h-10 w-5/6 rounded-md bg-[#17161f]/10" />
          <div className="mt-3 h-4 w-full rounded-md bg-[#17161f]/10" />
          <div className="mt-2 h-4 w-11/12 rounded-md bg-[#17161f]/10" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-lg bg-[#f7f1e5]" />
            <div className="h-24 rounded-lg bg-[#f7f1e5]" />
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm">
            <div className="h-6 w-28 rounded-md bg-[#17161f]/10" />
            <div className="mt-4 grid gap-3">
              <div className="h-20 rounded-lg bg-[#f7f1e5]" />
              <div className="h-20 rounded-lg bg-[#f7f1e5]" />
            </div>
          </div>

          <div className="rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm">
            <div className="h-6 w-32 rounded-md bg-[#17161f]/10" />
            <div className="mt-4 grid gap-3">
              <div className="h-24 rounded-lg bg-[#f7f1e5]" />
              <div className="h-24 rounded-lg bg-[#f7f1e5]" />
              <div className="h-24 rounded-lg bg-[#f7f1e5]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
