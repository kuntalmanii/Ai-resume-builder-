"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Calendar, Award, Star, Loader2, BookOpen, Send, AwardIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { interviewsAPI, resumesAPI, jobDescriptionsAPI } from "@/lib/api";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  type: string;
  answer_hint?: string;
  star_framework_hint?: string;
}

interface InterviewSession {
  id: string;
  resume_id: string;
  job_description_id?: string;
  question_bank: { items: Question[] };
  practice_log: { items: any[] };
  overall_score?: number;
  created_at: string;
}

export default function InterviewsPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [jds, setJds] = useState<any[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Forms
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedJdId, setSelectedJdId] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resList, jdList, sessList] = await Promise.all([
        resumesAPI.list(),
        jobDescriptionsAPI.list(),
        interviewsAPI.list()
      ]);
      setResumes(resList);
      setJds(jdList);
      setSessions(sessList);
      if (resList.length > 0) setSelectedResumeId(resList[0].id);
      if (jdList.length > 0) setSelectedJdId(jdList[0].id);
      if (sessList.length > 0) {
        setActiveSession(sessList[0]);
      }
    } catch (err) {
      toast.error("Failed to load interview dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) {
      toast.error("Please select a resume context.");
      return;
    }
    try {
      setGenerating(true);
      const res = await interviewsAPI.generate({
        resume_id: selectedResumeId,
        job_description_id: selectedJdId || undefined,
      });
      toast.success("Tailored interview session generated!");
      setActiveSession(res);
      setActiveQuestionIdx(0);
      setEvalResult(null);
      setUserAnswer("");
      fetchData();
    } catch (err) {
      toast.error("Failed to generate mock prep.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswer) return;
    const activeQ = activeSession.question_bank.items[activeQuestionIdx];
    try {
      setSubmittingAnswer(true);
      const res = await interviewsAPI.submitAnswer(activeSession.id, {
        question_id: activeQ.id,
        user_answer: userAnswer,
      });
      setEvalResult(res);
      toast.success("Answer evaluated!");
      fetchData();
    } catch (err) {
      toast.error("Failed to submit response.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const activeQuestion = activeSession?.question_bank?.items?.[activeQuestionIdx];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            Practice Mock Preparation
          </h1>
          <p className="text-muted-foreground mt-1">
            Simulate real tech interview scenarios grounded on your resume experiences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session setup / list */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Start Mock Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Resume Context</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm text-foreground bg-transparent"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} (v{r.version})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Job Description (Optional)</label>
                  <select
                    value={selectedJdId}
                    onChange={(e) => setSelectedJdId(e.target.value)}
                    className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm text-foreground bg-transparent"
                  >
                    <option value="">General Interview</option>
                    {jds.map((jd) => (
                      <option key={jd.id} value={jd.id}>
                        {jd.role} at {jd.company}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full" disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tailoring Mock Prep...
                    </>
                  ) : (
                    "Launch Interactive Session"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Prep Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No mock history found.
                </div>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSession(sess);
                      setActiveQuestionIdx(0);
                      setEvalResult(null);
                      setUserAnswer("");
                    }}
                    className={`p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/30 transition-all flex items-center justify-between ${
                      activeSession?.id === sess.id ? "border-primary bg-primary-subtle text-primary" : "border-border"
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate max-w-[150px]">
                        Session {sess.id.slice(0, 8)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(sess.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {sess.overall_score && (
                      <Badge variant="outline" className="font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
                        Score: {sess.overall_score.toFixed(1)}/10
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Prep Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {activeSession && activeQuestion ? (
            <Card className="border border-border">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border">
                <div className="space-y-1">
                  <Badge variant="outline" className="uppercase font-semibold tracking-wider text-[10px]">
                    Question {activeQuestionIdx + 1} of {activeSession.question_bank.items.length}
                  </Badge>
                  <CardTitle className="text-base text-foreground mt-1">
                    {activeQuestion.question}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {activeQuestion.type}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Hints panel */}
                {(activeQuestion.answer_hint || activeQuestion.star_framework_hint) && (
                  <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100/60 text-xs space-y-2 dark:bg-slate-900 dark:border-slate-800">
                    {activeQuestion.answer_hint && (
                      <div>
                        <span className="font-bold text-indigo-800 dark:text-indigo-400">Answer Focus Area:</span>{" "}
                        <span className="text-muted-foreground">{activeQuestion.answer_hint}</span>
                      </div>
                    )}
                    {activeQuestion.star_framework_hint && (
                      <div>
                        <span className="font-bold text-indigo-800 dark:text-indigo-400">STAR Suggestion:</span>{" "}
                        <span className="text-muted-foreground">{activeQuestion.star_framework_hint}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Input area */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Your Answer</label>
                  <Textarea
                    placeholder="Structure your answer using Situation, Task, Action, Result..."
                    rows={6}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeQuestionIdx === 0}
                      onClick={() => {
                        setActiveQuestionIdx(activeQuestionIdx - 1);
                        setEvalResult(null);
                        setUserAnswer("");
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeQuestionIdx === activeSession.question_bank.items.length - 1}
                      onClick={() => {
                        setActiveQuestionIdx(activeQuestionIdx + 1);
                        setEvalResult(null);
                        setUserAnswer("");
                      }}
                    >
                      Next
                    </Button>
                  </div>
                  
                  <Button onClick={handleSubmitAnswer} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={submittingAnswer}>
                    {submittingAnswer ? "Evaluating answer..." : "Evaluate Answer"}
                  </Button>
                </div>

                {/* Evaluation Results */}
                {evalResult && (
                  <div className="mt-6 border border-border rounded-xl overflow-hidden bg-card shadow-sm space-y-4">
                    <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                      <h3 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                        <AwardIcon className="w-4 h-4 text-amber-500" /> Evaluation Report
                      </h3>
                      <Badge className="bg-amber-500 text-white font-extrabold text-xs px-2.5 py-0.5">
                        Rating: {evalResult.score}/10
                      </Badge>
                    </div>
                    
                    <div className="px-6 pb-6 space-y-4">
                      <div className="text-sm space-y-1">
                        <span className="font-bold text-foreground">Feedback:</span>
                        <p className="text-muted-foreground leading-relaxed text-xs">{evalResult.feedback}</p>
                      </div>

                      <div className="text-sm space-y-1">
                        <span className="font-bold text-foreground">Improvement Tips:</span>
                        <p className="text-muted-foreground leading-relaxed text-xs">{evalResult.improvement_tips}</p>
                      </div>

                      <div className="text-sm space-y-1">
                        <span className="font-bold text-foreground">Model Answer Pattern:</span>
                        <div className="bg-muted/40 p-4 rounded-lg text-xs leading-relaxed italic font-mono text-muted-foreground/90 border border-border/60">
                          {evalResult.model_answer}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-96 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
              <MessageSquare className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-foreground text-lg">No mock session active</h3>
              <p className="max-w-xs text-xs mt-1">
                Configure your resume and optional job context on the left to start prep simulations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
