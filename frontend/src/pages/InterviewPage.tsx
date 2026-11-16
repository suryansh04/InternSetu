import { InterviewResults } from "@/components/interview/InterviewResults";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { LockedInterview } from "@/components/interview/LockedInterview";
import { useInterviewAttempts } from "@/hooks/useInterviewAttempts";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { isLocked } from "@/lib/interview";

export default function InterviewPage() {
  const attempts = useInterviewAttempts();
  const session = useInterviewSession({ onAnswerSaved: attempts.refetch });

  if (isLocked(session.phase)) {
    return (
      <LockedInterview
        role={session.role}
        question={session.questions[session.index]}
        number={session.index + 1}
        total={session.questions.length}
        phase={session.phase}
        secondsLeft={session.secondsLeft}
        stream={session.camera.stream}
        onStartAnswering={session.startAnswering}
        onStopAnswering={session.stopAnswering}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <InterviewSetup
        phase={session.phase}
        role={session.role}
        onRoleChange={session.setRole}
        onGenerate={session.generateQuestions}
        onStart={session.start}
        onChangeRole={session.reset}
        camera={session.camera}
      />
      <InterviewResults attempts={attempts.data} />
    </div>
  );
}
