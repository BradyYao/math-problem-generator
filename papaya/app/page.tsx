import Link from "next/link";

const features = [
  {
    icon: "🎯",
    title: "Adapts to your level",
    description:
      "Every problem is chosen based on what you know — not too easy, not overwhelming.",
  },
  {
    icon: "💡",
    title: "3-level hints",
    description:
      "Stuck? Get a nudge in the right direction without giving away the answer.",
  },
  {
    icon: "⏱️",
    title: "Fits your schedule",
    description:
      "5, 10, 20, or 30 minutes. Papaya gives you a complete session in whatever time you have.",
  },
  {
    icon: "📈",
    title: "Track your progress",
    description:
      "See which topics you're strong in and where you have room to grow.",
  },
  {
    icon: "🏆",
    title: "Compete with friends",
    description:
      "Challenge a friend to the same problem set and see who comes out on top.",
  },
  {
    icon: "📚",
    title: "SAT, ACT & AMC ready",
    description:
      "Problems pulled from real past exams so you practice what actually shows up.",
  },
];

const personas = [
  {
    name: "Prepping for the SAT?",
    description:
      "Set a score target and a test date. Papaya builds your weak areas first.",
  },
  {
    name: "Just want to get better?",
    description:
      "Pick a topic, set a time, and go. No account needed to start.",
  },
  {
    name: "Training for AMC?",
    description:
      "Hard problems with full worked solutions. Skip the parts you already know.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center bg-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-6">
          K–12 math practice, personalized
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl leading-tight">
          The right math problem,{" "}
          <span className="text-indigo-600">right now</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-500 leading-relaxed">
          Papaya gives you on-demand practice problems matched to your skill
          level and available time — with hints that guide you, not just give it
          away.
        </p>
        <div className="mt-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Start practicing — it&apos;s free
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-400">No account required to start</p>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-zinc-900 mb-12">
            Built for how students actually study
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-zinc-900 mb-1">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-zinc-900 mb-10">
            Whatever your goal, Papaya meets you there
          </h2>
          <div className="flex flex-col gap-4">
            {personas.map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-5"
              >
                <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-900">{p.name}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to practice?
        </h2>
        <p className="text-indigo-200 mb-8 text-base max-w-md mx-auto">
          Takes 2 minutes to set up. We&apos;ll figure out where you are and give you
          problems that actually help.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
        >
          Get started
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 px-6 py-8 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} Papaya. All rights reserved.
      </footer>
    </div>
  );
}
