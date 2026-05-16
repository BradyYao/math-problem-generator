import Image from "next/image";
import Link from "next/link";

const features = [
  {
    icon: "🎯",
    color: "bg-orange-100 text-orange-600",
    title: "Adapts to your level",
    description:
      "Every problem is chosen based on what you know — not too easy, not overwhelming.",
  },
  {
    icon: "💡",
    color: "bg-yellow-100 text-yellow-600",
    title: "3-level hints",
    description:
      "Stuck? Get a nudge in the right direction without giving away the answer.",
  },
  {
    icon: "⏱️",
    color: "bg-green-100 text-green-600",
    title: "Fits your schedule",
    description:
      "5, 10, 20, or 30 minutes. Papaya gives you a complete session in whatever time you have.",
  },
  {
    icon: "📈",
    color: "bg-blue-100 text-blue-600",
    title: "Track your progress",
    description:
      "See which topics you're strong in and where you have room to grow.",
  },
  {
    icon: "🏆",
    color: "bg-purple-100 text-purple-600",
    title: "Compete with friends",
    description:
      "Challenge a friend to the same problem set and see who comes out on top.",
  },
  {
    icon: "📚",
    color: "bg-rose-100 text-rose-600",
    title: "SAT, ACT & AMC ready",
    description:
      "Problems pulled from real past exams so you practice what actually shows up.",
  },
];

const personas = [
  {
    dot: "bg-orange-500",
    name: "Prepping for the SAT?",
    description:
      "Set a score target and a test date. Papaya builds your weak areas first.",
  },
  {
    dot: "bg-green-500",
    name: "Just want to get better?",
    description:
      "Pick a topic, set a time, and go. No account needed to start.",
  },
  {
    dot: "bg-purple-500",
    name: "Training for AMC?",
    description:
      "Hard problems with full worked solutions. Skip the parts you already know.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-24 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 40%, #fef3c7 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-orange-200 rounded-full opacity-30 -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-200 rounded-full opacity-40 translate-x-1/3 translate-y-1/3 blur-3xl" />

        <Image
          src="/logo.png"
          alt="Papaya"
          width={220}
          height={220}
          priority
          className="mb-6 relative z-10 drop-shadow-md"
        />
        <div className="relative z-10 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700 mb-6 border border-orange-200">
          K–12 math practice, personalized
        </div>
        <h1 className="relative z-10 max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl leading-tight">
          The right math problem,{" "}
          <span className="text-orange-500">right now</span>
        </h1>
        <p className="relative z-10 mt-5 max-w-xl text-lg text-zinc-600 leading-relaxed">
          Papaya gives you on-demand practice problems matched to your skill
          level and available time — with hints that guide you, not just give it
          away.
        </p>
        <div className="relative z-10 mt-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all hover:shadow-orange-300 hover:-translate-y-0.5"
          >
            Start practicing — it&apos;s free
          </Link>
        </div>
        <p className="relative z-10 mt-4 text-sm text-zinc-400">No account required to start</p>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-zinc-900 mb-12">
            Built for how students actually study
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center text-xl mb-4`}>
                  {f.icon}
                </div>
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
      <section className="px-6 py-20" style={{ background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-zinc-900 mb-10">
            Whatever your goal, Papaya meets you there
          </h2>
          <div className="flex flex-col gap-4">
            {personas.map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-4 rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-sm"
              >
                <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${p.dot} shrink-0`} />
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
      <section className="px-6 py-20 text-center" style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)" }}>
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to practice?
        </h2>
        <p className="text-orange-100 mb-8 text-base max-w-md mx-auto">
          Takes 2 minutes to set up. We&apos;ll figure out where you are and give you
          problems that actually help.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-orange-600 hover:bg-orange-50 transition-colors shadow-lg"
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
