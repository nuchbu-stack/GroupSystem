import React, { useState } from "react";
import { Assignment, RubricItem } from "../types";
import { Plus, Trash2, Save, X, BookOpen, Users, Award, ClipboardList } from "lucide-react";

interface AssignmentFormProps {
  onSave: (assignmentData: Omit<Assignment, "id" | "instructorEmail" | "instructorName" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initialData?: Assignment;
}

const DEFAULT_RUBRICS: Omit<RubricItem, "id">[] = [
  { item: "ความถูกต้องและสมบูรณ์ของเนื้อหา", description: "เนื้อหาตรงกับข้อกำหนด มีความถูกต้องและครบถ้วนตามหลักวิชาการ", maxScore: 10 },
  { item: "การทำงานร่วมกันและบทบาทหน้าที่", description: "การแบ่งงานชัดเจน ทุกคนมีบทบาทหน้าที่รับผิดชอบและให้ความร่วมมือ", maxScore: 10 },
  { item: "ทักษะการนำเสนอและการตอบคำถาม", description: "นำเสนอได้น่าสนใจ ชัดเจน ตรงประเด็น และตอบคำถามได้ถูกต้อง", maxScore: 10 },
];

export default function AssignmentForm({ onSave, onCancel, initialData }: AssignmentFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [courseName, setCourseName] = useState(initialData?.courseName || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [minMembers, setMinMembers] = useState(initialData?.minMembersPerGroup || 1);
  const [maxMembers, setMaxMembers] = useState(initialData?.maxMembersPerGroup || 5);
  
  // Student roster parsing states
  const [rosterInput, setRosterInput] = useState(initialData?.studentRoster?.join("\n") || "");
  
  // Rubrics state
  const [rubrics, setRubrics] = useState<RubricItem[]>(
    initialData?.rubrics || DEFAULT_RUBRICS.map((r, i) => ({ ...r, id: `rubric_${Date.now()}_${i}` } as RubricItem))
  );

  const [newRubricItem, setNewRubricItem] = useState("");
  const [newRubricDesc, setNewRubricDesc] = useState("");
  const [newRubricMax, setNewRubricMax] = useState(10);

  const handleAddRubric = () => {
    if (!newRubricItem.trim()) return;
    const newItem: RubricItem = {
      id: `rubric_${Date.now()}`,
      item: newRubricItem.trim(),
      description: newRubricDesc.trim(),
      maxScore: newRubricMax,
    };
    setRubrics([...rubrics, newItem]);
    setNewRubricItem("");
    setNewRubricDesc("");
    setNewRubricMax(10);
  };

  const handleRemoveRubric = (id: string) => {
    setRubrics(rubrics.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseName.trim() || !description.trim()) {
      alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    // Parse students from textarea (split by newline, commas, or spaces)
    const students = rosterInput
      .split(/[\n,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== "" && email.includes("@"));

    onSave({
      title: title.trim(),
      courseName: courseName.trim(),
      description: description.trim(),
      minMembersPerGroup: Number(minMembers),
      maxMembersPerGroup: Number(maxMembers),
      studentRoster: students,
      rubrics: rubrics,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 max-w-4xl mx-auto my-6">
      <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-violet-600" />
            {initialData ? "แก้ไขงานกลุ่ม/วิชา" : "สร้างงานกลุ่ม / ใบงานวิชาใหม่"}
          </h2>
          <p className="text-sm text-slate-500">กำหนดเงื่อนไข จำนวนสมาชิก รายชื่อผู้รับสิทธิ์ และเกณฑ์ให้คะแนนละเอียด</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
          id="btn-close-form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">ชื่อวิชา / รหัสวิชา (เช่น CS 311) *</label>
            <input
              type="text"
              required
              placeholder="เช่น CS301 Web App Development"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 transition"
              id="input-course-name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">หัวข้องานกลุ่ม (Title) *</label>
            <input
              type="text"
              required
              placeholder="เช่น โครงงานพัฒนาเว็บบอร์ดตอบคำถามด้วย React"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 transition"
              id="input-assignment-title"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">รายละเอียดงานที่ต้องปฏิบัติ *</label>
          <textarea
            required
            rows={4}
            placeholder="อภิปรายความต้องการ โครงสร้างฐานข้อมูล เค้าโครงหน้าจอ และส่งข้อมูลอ้างอิงเป็นลิงก์ไฟล์งาน"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 transition"
            id="input-assignment-desc"
          />
        </div>

        {/* Member Constraints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-500" />
              จำนวนสมาชิกกลุ่มขั้นต่ำ (คน)
            </label>
            <input
              type="number"
              min={1}
              max={maxMembers}
              value={minMembers}
              onChange={(e) => setMinMembers(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 transition"
              id="input-min-members"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-pink-500" />
              จำนวนสมาชิกกลุ่มสูงสุด (คน) *
            </label>
            <input
              type="number"
              min={minMembers}
              max={20}
              required
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-slate-800 transition"
              id="input-max-members"
            />
          </div>
        </div>

        {/* Roster list input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              รายชื่อเมลนักศึกษารับสิทธิ์เข้าร่วม (แยกด้วยขึ้นบรรทัดใหม่, ลูกน้ำ ฯลฯ) *
            </label>
            <span className="text-xs text-slate-400">ห้ามใส่เว้นว่าง หรือเมลที่ไม่มีเครื่องหมาย @</span>
          </div>
          <p className="text-xs text-slate-500 -mt-1 bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
            <strong>หมายเหตุความปลอดภัย:</strong> นักศึกษาที่มีชื่อตรงกับ Email ในลิสต์นี้เท่านั้นจะเห็นหัวข้อและสามารถจัดกลุ่มร่วมกันได้ (อาจารย์เข้าถึงได้โดยไม่มีเงื่อนไขใด ๆ)
          </p>
          <textarea
            rows={5}
            placeholder="ตัวอย่างเช่น:&#10;somchai.g@bumail.net&#10;somsri.y@bumail.net&#10;paitoon.a@bumail.net"
            value={rosterInput}
            onChange={(e) => setRosterInput(e.target.value)}
            className="w-full px-4 py-2.5 font-mono text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 transition"
            id="input-student-roster"
          />
        </div>

        {/* Rubrics Definition */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5">
            <Award className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-slate-800">เกณฑ์การให้คะแนน (Evaluation Rubrics)</h3>
          </div>

          <div className="space-y-3">
            {rubrics.map((rubric, idx) => (
              <div key={rubric.id} className="flex gap-3 justify-between items-start p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded">เกณฑ์ที่ {idx + 1}</span>
                    <span className="font-medium text-slate-800">{rubric.item}</span>
                    <span className="text-xs text-amber-600 font-bold">({rubric.maxScore} คะแนน)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{rubric.description || "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRubric(rubric.id)}
                  className="p-1 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition"
                  title="ลบเกณฑ์ประเมิน"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add rubric form */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="เพิ่มหัวข้อหลักเกณฑ์ประเมิน เช่น 'ความก้าวหน้ารายสัปดาห์'"
                  value={newRubricItem}
                  onChange={(e) => setNewRubricItem(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="คะแนนเต็ม"
                  value={newRubricMax}
                  onChange={(e) => setNewRubricMax(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddRubric}
                className="w-full py-1.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                เพิ่มเกณฑ์
              </button>
            </div>
            <input
              type="text"
              placeholder="คำอธิบายเกณฑ์พอสังเขป (เช่น ดูจากสไลด์นำเสนอและการร่วมมือในทีม)"
              value={newRubricDesc}
              onChange={(e) => setNewRubricDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition font-medium cursor-pointer"
            id="btn-cancel"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-violet-700/15 cursor-pointer"
            id="btn-save"
          >
            <Save className="h-4 w-4" />
            บันทึกใบงาน
          </button>
        </div>
      </form>
    </div>
  );
}
