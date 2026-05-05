"use client";

import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import AssessmentGate from "@/components/assessment/AssessmentGate";
import QuizPage from "@/components/quizzes/QuizPage";
import TasksPanel from "@/components/activities/TasksPanel";

type ActivityTab = "QUIZZES" | "TASKS";

export default function ActivitiesPage() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [tab, setTab] = React.useState<ActivityTab>("QUIZZES");

  React.useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar_collapsed");
      if (v !== null) setCollapsed(v === "true");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex-1">
        <AssessmentGate
          title="Activities unlock after the pre-assessment"
          description="Complete the initial digital literacy assessment to access quizzes and activity tasks."
        >
          {tab === "QUIZZES" ? (
            <QuizPage activityTab={tab} onSwitchTab={setTab} />
          ) : (
            <TasksPanel activityTab={tab} onSwitchTab={setTab} />
          )}
        </AssessmentGate>
      </main>
    </div>
  );
}
