import React, { useState, useEffect } from "react";
import { Assignment, Group, GradeScore, RubricItem } from "../types";
import { Award, CheckCircle2, User, Users, ClipboardCheck, ArrowLeft, RefreshCw } from "lucide-react";

interface GradingPanelProps {
  assignment: Assignment;
  group: Group;
  onSaveGrading: (groupGrading: GradeScore, individualGrading: { [studentEmail: string]: GradeScore }) => Promise<void>;
  onClose: () => void;
}

export default function GradingPanel({ assignment, group, onSaveGrading, onClose }: GradingPanelProps) {
  // Group score state mapped by rubricId
  const [groupScores, setGroupScores] = useState<{ [rubricId: string]: number }>(() => {
    const scores: { [rubricId: string]: number } = {};
    assignment.rubrics.forEach((r) => {
      scores[r.id] = group.groupGrading?.rubricScores[r.id] ?? r.maxScore;
    });
    return scores;
  });
  const [groupFeedback, setGroupFeedback] = useState(group.groupGrading?.feedback || "");

  // Individual student states
  const [individualScores, setIndividualScores] = useState<{ [email: string]: { [rubricId: string]: number } }>(() => {
    const scores: { [email: string]: { [rubricId: string]: number } } = {};
    group.members.forEach((m) => {
      scores[m.email] = {};
      assignment.rubrics.forEach((r) => {
        scores[m.email][r.id] = group.individualGrading?.[m.email]?.rubricScores[r.id] ?? r.maxScore;
      });
    });
    return scores;
  });

  const [individualFeedback, setIndividualFeedback] = useState<{ [email: string]: string }>(() => {
    const feedbacks: { [email: string]: string } = {};
    group.members.forEach((m) => {
      feedbacks[m.email] = group.individualGrading?.[m.email]?.feedback || "";
    });
    return feedbacks;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"group" | "individual">("group");

  const [selectedStudentEmail, setSelectedStudentEmail] = useState(group.members[0]?.email || "");

  const handleGroupScoreChange = (rubricId: string, value: number) => {
    setGroupScores({ ...groupScores, [rubricId]: value });
  };

  const handleIndividualScoreChange = (email: string, rubricId: string, value: number) => {
    setIndividualScores({
      ...individualScores,
      [email]: {
        ...individualScores[email],
        [rubricId]: value,
      },
    });
  };

  const handleIndividualFeedbackChange = (email: string, text: string) => {
    setIndividualFeedback({
      ...individualFeedback,
      [email]: text,
    });
  };

  const handleSubmitAllGrades = async () => {
    setIsSubmitting(true);
    try {
      const groupGrading: GradeScore = {
        rubricScores: groupScores,
        feedback: groupFeedback.trim(),
        gradedAt: new Date().toISOString(),
        gradedBy: assignment.instructorEmail,
      };

      const finalIndividual: { [email: string]: GradeScore } = {};
      group.members.forEach((m) => {
        finalIndividual[m.email] = {
          rubricScores: individualScores[m.email] || {},
          feedback: (individualFeedback[m.email] || "").trim(),
          gradedAt: new Date().toISOString(),
          gradedBy: assignment.instructorEmail,
        };
      });

      await onSaveGrading(groupGrading, finalIndividual);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถบันทึกเกรดได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalGroupPoints = (Object.values(groupScores) as number[]).reduce((sum: number, score: number) => sum + score, 0);
  const maxGroupPoints = assignment.rubrics.reduce((sum, r) => sum + r.maxScore, 0);

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 shadow-lg p-5 sm:p-7 max-w-4xl mx-auto my-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 px-2.5 bg-white text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition border border-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </button>
          <div>
            <span className="text-xs uppercase font-mono px-2 py-0.5 bg-violet-100 text-violet-800 rounded font-semibold">
              ห้องให้คะแนนเกณฑ์รูบริก
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-0.5">
              กลุ่มที่ {group.groupNumber}: {group.groupName}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-violet-600 text-white font-sans font-bold text-sm px-4 py-2 rounded-xl shadow-lg">
          <Award className="h-4.5 w-4.5" />
          <span className="opacity-90">คะแนนกลุ่มเฉลี่ย:</span>
          <span>{totalGroupPoints} / {maxGroupPoints} คะแนน</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mt-5 p-1 bg-slate-200/60 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab("group")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer ${
            activeTab === "group" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Users className="h-4 w-4" />
            1. คะแนนกลุ่ม (Group Grade)
          </div>
        </button>
        <button
          onClick={() => setActiveTab("individual")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer ${
            activeTab === "individual" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <User className="h-4 w-4" />
            2. คะแนนรายบุคคล (Individual)
          </div>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === "group" ? (
        <div className="mt-5 bg-white rounded-xl border border-slate-150 p-5 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base">ประเมินผลกลุ่มภาพรวม</h3>
            <p className="text-xs text-slate-500">ให้คะแนนทั้งกลุ่มตามพารามิเตอร์เกณฑ์ที่ผู้สอนระบุ</p>
          </div>

          <div className="space-y-6">
            {assignment.rubrics.map((rubric) => (
              <div key={rubric.id} className="space-y-2 p-4 bg-slate-50/75 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{rubric.item}</span>
                    <p className="text-xs text-slate-500">{rubric.description}</p>
                  </div>
                  <span className="text-sm font-bold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-lg">
                    {groupScores[rubric.id] ?? rubric.maxScore} / {rubric.maxScore} คะแนน
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={rubric.maxScore}
                  step="0.5"
                  value={groupScores[rubric.id] ?? rubric.maxScore}
                  onChange={(e) => handleGroupScoreChange(rubric.id, Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 คะแนน (ปรับปรุง)</span>
                  <span>{rubric.maxScore / 2} คะแนน (ปานกลาง)</span>
                  <span>{rubric.maxScore} คะแนน (ดีเยี่ยม)</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">คำแนะนำ / ข้อเสนอแนะแก่งานกลุ่ม</label>
            <textarea
              rows={3}
              placeholder="ชื่นชมโครงงาน ทำได้เป็นระบบ แนะนำเพิ่มแหล่งอ้างอิงและปรับแก้จุดสะกดผิดตามสไลด์หน้า 4"
              value={groupFeedback}
              onChange={(e) => setGroupFeedback(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800"
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Member selector list */}
          <div className="bg-white rounded-xl border border-slate-150 p-4 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-2">เลือกสมาชิกกลุ่ม</h4>
            {group.members.map((m) => {
              const studentCompleted = Object.keys(individualScores[m.email] || {}).length === assignment.rubrics.length;
              return (
                <button
                  key={m.email}
                  onClick={() => setSelectedStudentEmail(m.email)}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition cursor-pointer ${
                    selectedStudentEmail === m.email
                      ? "bg-violet-50 border border-violet-200 text-violet-950"
                      : "bg-slate-50 border border-transparent text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <div className="truncate flex items-center gap-2">
                    <div className="bg-white p-1 rounded border border-slate-200 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{m.name || m.email.split("@")[0]}</p>
                      <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                      <p className="text-[10px] text-zinc-400 truncate bg-slate-200 px-1 rounded-sm mt-0.5 inline-block">{m.roleDescription || "ไม่ได้กรอกหน้าที่"}</p>
                    </div>
                  </div>
                  {studentCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Grading sliders for selected student */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-150 p-5 space-y-6">
            {selectedStudentEmail ? (
              <>
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      คะแนนรายบุคคล: {group.members.find((m) => m.email === selectedStudentEmail)?.name}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedStudentEmail}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded text-xs font-bold text-amber-800">
                    หน้าที่: {group.members.find((m) => m.email === selectedStudentEmail)?.roleDescription || "ไม่ได้ระบุหน้าที่หลัก"}
                  </div>
                </div>

                <div className="space-y-5">
                  {assignment.rubrics.map((rubric) => (
                    <div key={rubric.id} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-800">{rubric.item}</span>
                        <span className="font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">
                          {(individualScores[selectedStudentEmail]?.[rubric.id]) ?? rubric.maxScore} / {rubric.maxScore} คะแนน
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={rubric.maxScore}
                        step="0.5"
                        value={(individualScores[selectedStudentEmail]?.[rubric.id]) ?? rubric.maxScore}
                        onChange={(e) => handleIndividualScoreChange(selectedStudentEmail, rubric.id, Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ข้อเสนอแนะตัวบุคคล (ส่วนตัวเฉพาะผู้เรียน)</label>
                  <textarea
                    rows={2}
                    placeholder="สไลด์นำเสนอชัดถ้อยชัดคำมาก สามารถอภิปรายทฤษฎีได้อย่างลึกซึ้ง พยายามมีส่วนร่วมเวลากลุ่มตอบคำถามเพิ่มเติม"
                    value={individualFeedback[selectedStudentEmail] || ""}
                    onChange={(e) => handleIndividualFeedbackChange(selectedStudentEmail, e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-800"
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-400">กรุณาเลือกสมาชิกกลุ่มด้านข้างเพื่อลงคะแนน</div>
            )}
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-5 py-2 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSubmitAllGrades}
          disabled={isSubmitting}
          className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-700/20 px-6 cursor-pointer"
          id="btn-submit-grades"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              กำลังรวบรวมเเละส่งเกรด...
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4.5 w-4.5" />
              บันทึกคะแนนทั้งหมด (ทั้งกลุ่มและรายคน)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
