"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { GlowingEffect } from "./ui/glowing-effect";

const features = [
  {
    title: "Create Your Profile",
    description:
      "Sign up and create your profile in minutes. Share your skills, experience, and what you're looking to learn.",
    icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
  },
  {
    title: "Find Matches",
    description:
      "Discover people with the skills you want to learn and who want to learn what you can teach.",
    icon: <CheckCircle2 className="w-6 h-6 text-blue-500" />,
  },
  {
    title: "Connect & Learn",
    description:
      "Connect with your matches and start your skill exchange journey. Learn from each other at your own pace.",
    icon: <CheckCircle2 className="w-6 h-6 text-purple-500" />,
  },
  {
    title: "Build Your Network",
    description:
      "Grow your professional network while learning new skills from people in your community.",
    icon: <CheckCircle2 className="w-6 h-6 text-yellow-500" />,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function GlowingFeaturesSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            How It Works
          </h2>
          <p className="max-w-[700px] text-gray-500 md:text-xl">
            Join thousands of learners and teachers in our community. It's easy
            to get started!
          </p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="relative group h-full"
            >
              <GlowingEffect
                className="rounded-2xl h-full"
                glow
                blur={10}
                spread={30}
                movementDuration={3}
                borderWidth={1}
              >
                <div className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5">
                  <div className="mb-4 w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </GlowingEffect>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default GlowingFeaturesSection;
