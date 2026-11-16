import type { ReactNode } from "react";
import { BookmarkCheck, FileText, Mic, Target } from "lucide-react";
import { GlowingEffect } from "./glowing-effect";

const features = [
  {
    icon: FileText,
    title: "Resume to profile in one upload",
    description:
      "Drop in your PDF resume. AI reads it and fills in your skills, location, interests and availability, ready for you to check.",
  },
  {
    icon: Target,
    title: "Matches with a reason",
    description:
      "Every internship gets a score out of 100 built from your skills, location, availability and how close the role is to what you do. You see each part.",
  },
  {
    icon: Mic,
    title: "Practise the interview",
    description:
      "Get two questions written for the role, answer them on camera, and receive a transcript, a score on five criteria and feedback on what to improve.",
  },
  {
    icon: BookmarkCheck,
    title: "Keep track",
    description:
      "Save internships you like and mark the ones you have applied to, so your shortlist is waiting next time you sign in.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-12 md:py-24 dark:bg-black">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 flex flex-col items-center justify-center space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tighter text-black sm:text-4xl md:text-5xl dark:text-white">
            What InternSetu does
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed dark:text-gray-400">
            From resume to shortlist to interview practice, in one place.
          </p>
        </div>

        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <GridItem
              key={title}
              icon={<Icon className="h-4 w-4 text-black dark:text-neutral-400" />}
              title={title}
              description={description}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

interface GridItemProps {
  title: string;
  description: string;
  icon: ReactNode;
}

const GridItem = ({ title, description, icon }: GridItemProps) => {
  return (
    <li className="min-h-[14rem] list-none">
      <div className="relative h-full rounded-2xl border p-2 transition-all duration-300 hover:shadow-lg md:rounded-3xl md:p-3 dark:border-gray-800">
        <GlowingEffect
          blur={0}
          borderWidth={3}
          spread={80}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl bg-white p-6 transition-all duration-300 hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                {title}
              </h3>
              <p className="font-sans text-sm/[1.125rem] text-gray-600 md:text-base/[1.375rem] dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
