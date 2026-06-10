import React, { useState, useRef } from "react";
import { Assignment, Group, GroupMember, Submission } from "../types";
import { 
  Users, UserPlus, Shield, FileText, Send, Download, ExternalLink, Trash2, 
  Award, Clock, CheckCircle, ChevronRight, UploadCloud, Edit3, HelpCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GroupDetailsProps {
  assignment: Assignment;
  group: Group;
  currentUserEmail: string | null;
  isInstructor: boolean;
  onJoinGroup: (groupId: string, memberName: string) => Promise<void>;
  onLeaveGroup: (groupId: string) => Promise<void>;
  onUpdateRole: (groupId: string, email: string, roleDescription: string) => Promise<void>;
  onSubmitWork: (groupId: string, submission: Omit<Submission, "id" | "submittedAt" | "submittedBy">) => Promise<void>;
  onDeleteSubmission: (groupId: string, submissionId: string) => Promise<void>;
  onOpenGrading: () => void;
}

export default function GroupDetails({
  assignment,
  group,
  currentUserEmail,
  isInstructor,
  onJoinGroup,
  onLeaveGroup,
  onUpdateRole,
  onSubmitWork,
  onDeleteSubmission,
  onOpenGrading,
}: GroupDetailsProps) {
  const [editingRoleEmail, setEditingRoleEmail] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinNameInput, setJoinNameInput] = useState("");

  // Submissions state
  const [submitDesc, setSubmitDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAMember = currentUserEmail ? group.members.some((m) => m.email === currentUserEmail) : false;
  const isFull = group.members.length >= assignment.maxMembersPerGroup;

  // Handle Drag & Drop
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  // Simulating uploads (Tactile interactive response)
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            try {
              // Submit mockup file metadata to backend
              await onSubmitWork(group.id, {
                fileName: selectedFile.name,
                fileDescription: submitDesc.trim() || `ส่งเล่มรายงานและสไลด์กลุ่ม ${group.groupName}`,
                fileUrl: `https://mock-storage.bu.ac.th/projects/${group.id}/${encodeURIComponent(selectedFile.name)}`,
              });
              setSelectedFile(null);
              setSubmitDesc("");
            } catch (err) {
              console.error(err);
              alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            } finally {
              setIsUploading(false);
              setUploadProgress(0);
            }
          }, 300);
          return 100;
        }
        return prev + 15;
      });
    }, 120);
  };

  const handleJoinClick = async () => {
    if (!joinNameInput.trim()) return;
    setIsJoining(true);
    try {
      await onJoinGroup(group.id, joinNameInput.trim());
      setJoinNameInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleEditRoleInit = (email: string, currentRole: string) => {
    setEditingRoleEmail(email);
    setRoleInput(currentRole);
  };

  const handleSaveRole = async (email: string) => {
    try {
      await onUpdateRole(group.id, email, roleInput.trim());
      setEditingRoleEmail(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-12 bg-white/5 w-48 h-48 rounded-full pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-pink-600/30 text-pink-300 border border-pink-700/60 text-xs px-2.5 py-0.5 rounded-full font-bold">
                กลุ่มที่ {group.groupNumber}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {group.members.length} / {assignment.maxMembersPerGroup} สมาชิก
              </span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mt-1">
              {group.groupName}
            </h2>
            <p className="text-xs text-slate-400 mt-1">ตั้งกลุ่มเมื่อ: {new Date(group.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString("th-TH")}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isInstructor && (
              <button
                onClick={onOpenGrading}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-f from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-900/30 transition cursor-pointer"
                id="btn-instructor-grade"
              >
                <Award className="h-4.5 w-4.5 mr-1" />
                กรอกคะแนนรูบริกกลุ่ม & เดี่ยว
              </button>
            )}

            {!isInstructor && isAMember && (
              <button
                onClick={() => onLeaveGroup(group.id)}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition cursor-pointer"
                id="btn-leave-group"
              >
                ออกจากกลุ่มนี้
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Left - Members & Roles, Right - Submissions & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MEMBERS & ROLES */}
        <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-slate-100 shadow">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              สมาชิกกลุ่มและการรับผิดชอบ
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ความจุ: มิน {assignment.minMembersPerGroup} - แม็กซ์ {assignment.maxMembersPerGroup} คน
            </span>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            {group.members.map((member) => {
              const isSelf = member.email === currentUserEmail;
              const isEditing = editingRoleEmail === member.email;

              return (
                <div key={member.email} className={`p-3.5 rounded-xl border transition ${
                  isSelf ? "bg-violet-50/50 border-violet-100" : "bg-slate-50/60 border-slate-150"
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1">
                        {member.name || member.email.split("@")[0]}
                        {isSelf && <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-violet-600 text-white rounded">คุณ</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{member.email}</p>
                    </div>

                    {!isInstructor && isSelf && !isEditing && (
                      <button
                        onClick={() => handleEditRoleInit(member.email, member.roleDescription)}
                        className="p-1 px-2 text-xs font-semibold text-violet-600 hover:bg-violet-100 rounded-lg flex items-center gap-1"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        ระบุหน้าที่
                      </button>
                    )}
                  </div>

                  {/* Role descriptions */}
                  <div className="mt-2.5">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={roleInput}
                          placeholder="เช่น พัฒนาแบบจำลอง, ร่างสไลด์ ฯลฯ"
                          onChange={(e) => setRoleInput(e.target.value)}
                          className="flex-1 px-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                        <button
                          onClick={() => handleSaveRole(member.email)}
                          className="px-3 py-1 bg-violet-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          บันทึก
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 p-2 bg-white border border-slate-100 rounded-lg">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">หน้าที่:</span>
                        <p className="text-xs text-slate-700 font-medium ml-1">
                          {member.roleDescription || <span className="text-slate-400 italic font-normal">ไม่ได้ระบุหน้าที่ความรับผิดชอบหลัก</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick join group form for enrolled student not yet in group */}
            {!isInstructor && !isAMember && !isFull && currentUserEmail && (
              <div className="p-3.5 bg-yellow-50/50 border border-yellow-250 rounded-xl space-y-2.5 mt-4">
                <p className="text-xs text-yellow-900 font-medium">ท่านยังไม่ได้เข้ากลุ่มอื่นใด และมีสิทธิ์สมัครร่วมกลุ่มนี้</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="กรอกชื่อ-นามสกุลจริง"
                    value={joinNameInput}
                    onChange={(e) => setJoinNameInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                  <button
                    onClick={handleJoinClick}
                    disabled={isJoining}
                    className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    ขอเข้าร่วมกลุ่ม
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WORK SUBMISSIONS & GRADING REPORT */}
        <div className="lg:col-span-7 space-y-6">

          {/* EVALUATION REPORT CARD */}
          {group.groupGrading && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow space-y-4">
              <div className="border-b border-rose-100 pb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500 animate-bounce" />
                  <h3 className="font-bold text-slate-800 text-base">การประเมินผลและเกรดสิริรวม</h3>
                </div>
                <div className="text-xs bg-amber-50 text-amber-800 border border-amber-250 px-2 py-0.5 rounded font-bold">
                  ประเมินโดย {group.groupGrading.gradedBy}
                </div>
              </div>

              {/* Group Grade summary */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-3">
                  <span className="text-xs font-bold text-slate-500">ผลการประเมินภาพรวมระดับกลุ่ม</span>
                  <p className="text-xs text-slate-600 italic bg-white p-2 border border-slate-100 rounded mt-1">
                    "{group.groupGrading.feedback || "ไม่มีคอมเมนต์กลุ่มเพิ่มเติม"}"
                  </p>
                </div>
                <div className="text-center p-2 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-lg">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">คะแนนกลุ่ม</p>
                  <p className="text-2xl font-black">
                    {Object.values(group.groupGrading.rubricScores).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-[9px] opacity-85">เต็ม {assignment.rubrics.reduce((s, r) => s + r.maxScore, 0)}</p>
                </div>
              </div>

              {/* Individual Student Grade */}
              {!isInstructor && isAMember && group.individualGrading?.[currentUserEmail || ""] && (
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800">คะแนนประเมินรายนักศึกษา (ของคุณเฉพาะบุคคล)</span>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      สอบเดี่ยว/หน้าที่ได้ {Object.values(group.individualGrading[currentUserEmail || ""].rubricScores).reduce((a, b) => a + b, 0)} / {assignment.rubrics.reduce((s, r) => s + r.maxScore, 0)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 bg-white p-2 border border-slate-100 rounded">
                    <strong>ฟีดแบ็กรายบุคคุลจากผู้ประเมิน:</strong> "{group.individualGrading[currentUserEmail || ""].feedback || "ทักษะงานร่วมอยู่ในเกณฑ์ดีเยี่ยม"}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE WORK SUBMISSIONS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="h-5 w-5 text-pink-500" />
              การส่งไฟล์งานและลิงก์ความก้าวหน้า
            </h3>

            {/* List of submittals */}
            <div className="space-y-3">
              {group.submissions && group.submissions.length > 0 ? (
                group.submissions.map((sub) => (
                  <div key={sub.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                    <div className="truncate flex items-start gap-2.5">
                      <div className="p-2 bg-pink-100 text-pink-700 rounded-lg">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 truncate" title={sub.fileName}>{sub.fileName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{sub.fileDescription}</p>
                        <div className="flex gap-2 items-center text-[9px] text-zinc-400 font-mono mt-1">
                          <span>ส่งโดย: {sub.submittedBy}</span>
                          <span>•</span>
                          <span>{new Date(sub.submittedAt).toLocaleDateString("th-TH")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 px-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded text-xs flex items-center gap-0.5 border border-slate-200 bg-white cursor-pointer"
                        title="เปิดในแท็บใหม่"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">เปิด</span>
                      </a>

                      {!isInstructor && isAMember && (
                        <button
                          onClick={() => onDeleteSubmission(group.id, sub.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="ลบไฟล์งาน"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 font-sans text-xs">ยังไม่มีความก้าวหน้าหรือชิ้นงานจัดส่ง ณ ตอนนี้</div>
              )}
            </div>

            {/* Submit New Work Drag & Drop Form for current group members */}
            {!isInstructor && isAMember && (
              <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">ส่งงานกลุ่มครั้งใหม่</label>
                  <p className="text-[11px] text-slate-400 mt-0.5">รองรับไฟล์แผน รายงาน หรือการส่งลิงก์ชิ้นงาน</p>
                </div>

                {/* Upload drag-and-drop / selector boundary */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    dragActive ? "border-violet-600 bg-violet-50/40" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  id="dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  />
                  
                  <UploadCloud className="h-9 w-9 text-slate-400 mb-2" />
                  
                  {selectedFile ? (
                    <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-medium text-slate-700 block">ลากและวางไฟล์ หรือคลิกเพื่อค้นหา...</span>
                      <span className="text-[11px] text-slate-400 mt-1 block">PDF, Word, Powerpoint, Excel หรือ ZIP</span>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-3 bg-slate-50 border border-slate-150 rounded-xl"
                  >
                    <input
                      type="text"
                      placeholder="อธิบายสรุปงานที่จัดส่ง (เช่น: สไลด์เค้าโครงระบบ และสคริปต์ฐานข้อมูลกลุ่ม 3)"
                      value={submitDesc}
                      required
                      onChange={(e) => setSubmitDesc(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-slate-800"
                    />

                    {isUploading ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-violet-700 font-bold font-mono">
                          <span>กำลังจำลองดาวน์โหลดและอัปโหลดข้อมูลเข้า Cloud Bucket...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-violet-600 h-full transition-all duration-100"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold rounded shadow cursor-pointer"
                        >
                          ตกลงอัปโหลดชิ้นงาน
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
