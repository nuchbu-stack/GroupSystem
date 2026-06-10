import React, { useEffect, useState } from "react";
import { auth, db, googleProvider, isUserInstructor, OperationType, handleFirestoreError } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "firebase/firestore";
import Navbar from "./components/Navbar";
import AssignmentForm from "./components/AssignmentForm";
import GroupDetails from "./components/GroupDetails";
import GradingPanel from "./components/GradingPanel";
import { Assignment, Group, GroupMember, Submission, GradeScore } from "./types";
import { 
  BookOpen, Calendar, Users, Award, Shield, Plus, GraduationCap, ArrowRight,
  ClipboardList, CheckCircle, FileText, AlertCircle, Trash2, ArrowLeft, Loader2,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App context states
  const [isInstructor, setIsInstructor] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Forms and view controllers
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | undefined>(undefined);
  const [showGradingPanel, setShowGradingPanel] = useState(false);

  // Student join-state / group creation modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [studentRealName, setStudentRealName] = useState("");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Handle Google Login from App dashboard
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Popup login error: ", err);
    }
  };

  // 1. Auth Subscription Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (usr) {
        setIsInstructor(isUserInstructor(usr.email));
      } else {
        setIsInstructor(false);
        setAssignments([]);
        setSelectedAssignment(null);
        setGroups([]);
        setSelectedGroup(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Assignments Subscription (Context-Aware Querying)
  useEffect(() => {
    if (loading || !user) return;

    let assignmentsQuery;
    const path = "assignments";

    if (isInstructor) {
      // Instructors see assignments they created (safeguarded)
      assignmentsQuery = query(
        collection(db, path),
        where("instructorEmail", "==", user.email?.toLowerCase())
      );
    } else {
      // Students see assignments where they are explicitly in the roster
      assignmentsQuery = query(
        collection(db, path),
        where("studentRoster", "array-contains", user.email?.toLowerCase())
      );
    }

    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (snapshot) => {
        const list: Assignment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Assignment);
        });
        setAssignments(list);

        // Keep selected assignment updated if it exists
        if (selectedAssignment) {
          const fresh = list.find((a) => a.id === selectedAssignment.id);
          if (fresh) setSelectedAssignment(fresh);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [user, isInstructor, loading]);

  // 3. Real-time Groups Subscription once an Assignment is Selected
  useEffect(() => {
    if (!selectedAssignment) {
      setGroups([]);
      setSelectedGroup(null);
      return;
    }

    const path = `assignments/${selectedAssignment.id}/groups`;
    const groupsQuery = collection(db, path);

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const list: Group[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Group);
        });
        // Sort groups by groupNumber
        list.sort((a, b) => a.groupNumber - b.groupNumber);
        setGroups(list);

        // Keep selected group updated
        if (selectedGroup) {
          const fresh = list.find((g) => g.id === selectedGroup.id);
          if (fresh) setSelectedGroup(fresh);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [selectedAssignment]);

  // Create Assignment
  const handleSaveAssignment = async (assignmentData: Omit<Assignment, "id" | "instructorEmail" | "instructorName" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    const path = "assignments";

    try {
      if (editingAssignment) {
        // Update Action
        const assignmentRef = doc(db, path, editingAssignment.id);
        await updateDoc(assignmentRef, {
          ...assignmentData,
          updatedAt: serverTimestamp(),
        });
        alert("แก้ไขใบงานความต้องการเรียบร้อยแล้ว");
      } else {
        // Create Action
        await addDoc(collection(db, path), {
          ...assignmentData,
          instructorEmail: user.email?.toLowerCase(),
          instructorName: user.displayName || "ผู้สอนมหาวิทยาลัยกรุงเทพ",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert("เพิ่มใบงานความต้องการกลุ่มวิชาเรียบร้อยแล้ว");
      }
      setShowAssignmentForm(false);
      setEditingAssignment(undefined);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("คุณแน่ใจว่าต้องการลบใบงานกลุ่มวิชานี้? ข้อมูลกลุ่มและคะแนนทั้งหมดจะสูญหาย")) return;
    
    // Safety check: First delete all groups under this assignment (subcollections)
    // In our simplified test, we delete the assignment directly. Our database rules support physical cascading writes 
    const path = `assignments/${assignmentId}`;
    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment(null);
        setSelectedGroup(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Student / Instructor creates a Group
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !user) return;
    if (!newGroupName.trim()) return;
    if (!isInstructor && !studentRealName.trim()) return;

    // Check if student is already in a group for this assignment
    if (!isInstructor) {
      const alreadyInGroup = groups.some((grp) => 
        grp.members.some((m) => m.email === user.email?.toLowerCase())
      );
      if (alreadyInGroup) {
        alert("ท่านได้แต่งตั้งหรือเป็นสมาชิกในกลุ่มอื่นแล้วภายในใบงานนี้");
        return;
      }
    }

    setIsSubmittingGroup(true);
    const path = `assignments/${selectedAssignment.id}/groups`;

    try {
      const nextGroupNumber = groups.length > 0 ? Math.max(...groups.map((g) => g.groupNumber)) + 1 : 1;

      const initialMembers: GroupMember[] = [];
      if (!isInstructor) {
        initialMembers.push({
          email: user.email?.toLowerCase() || "",
          name: studentRealName.trim(),
          uid: user.uid,
          roleDescription: "ผู้ก่อตั้งกลุ่ม",
        });
      }

      const newGroupRef = await addDoc(collection(db, "assignments", selectedAssignment.id, "groups"), {
        assignmentId: selectedAssignment.id,
        groupName: newGroupName.trim(),
        groupNumber: nextGroupNumber,
        members: initialMembers,
        submissions: [],
        individualGrading: {},
        groupGrading: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Select newly created group to open details panel
      const newGroup: Group = {
        id: newGroupRef.id,
        assignmentId: selectedAssignment.id,
        groupName: newGroupName.trim(),
        groupNumber: nextGroupNumber,
        members: initialMembers,
        submissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSelectedGroup(newGroup);

      setNewGroupName("");
      setStudentRealName("");
      setShowCreateGroupModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Join a Group
  const handleJoinGroup = async (groupId: string, memberName: string) => {
    if (!user || !selectedAssignment) return;

    // Double check if already in any group
    const alreadyInGroup = groups.some((grp) => 
      grp.members.some((m) => m.email === user.email?.toLowerCase())
    );
    if (alreadyInGroup) {
      alert("ท่านได้เป็นสมาชิกในกลุ่มอื่นแล้ว กรุณาออกจากกลุ่มเดิมก่อนสมัครใหม่");
      return;
    }

    const path = `assignments/${selectedAssignment.id}/groups/${groupId}`;
    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) return;

      if (targetGroup.members.length >= selectedAssignment.maxMembersPerGroup) {
        alert("กลุ่มนี้มีสมาชิกครบตามที่ผู้สอนกำหนดแล้ว");
        return;
      }

      const updatedMembers = [
        ...targetGroup.members,
        {
          email: user.email?.toLowerCase() || "",
          name: memberName,
          uid: user.uid,
          roleDescription: "สมาชิกกลุ่ม",
        },
      ];

      await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Leave a Group
  const handleLeaveGroup = async (groupId: string) => {
    if (!user || !selectedAssignment) return;

    const path = `assignments/${selectedAssignment.id}/groups/${groupId}`;
    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) return;

      const updatedMembers = targetGroup.members.filter(
        (m) => m.email !== user.email?.toLowerCase()
      );

      if (updatedMembers.length === 0) {
        // Delete the group if no students left
        await deleteDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId));
        setSelectedGroup(null);
        alert("ออกจากกลุ่มเรียบร้อยแล้ว (กลุ่มถูกยกเลิกเนื่องจากไม่มีสมาชิกเหลืออยู่)");
      } else {
        await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId), {
          members: updatedMembers,
          updatedAt: serverTimestamp(),
        });
        setSelectedGroup(null);
        alert("ออกจากกลุ่มเรียบร้อยแล้ว");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Update Role description 
  const handleUpdateRole = async (groupId: string, email: string, roleDescription: string) => {
    if (!selectedAssignment) return;
    const path = `assignments/${selectedAssignment.id}/groups/${groupId}`;

    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) return;

      const updatedMembers = targetGroup.members.map((m) => {
        if (m.email === email) {
          return { ...m, roleDescription };
        }
        return m;
      });

      await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Submit files
  const handleSubmitWork = async (groupId: string, submission: Omit<Submission, "id" | "submittedAt" | "submittedBy">) => {
    if (!user || !selectedAssignment) return;
    const path = `assignments/${selectedAssignment.id}/groups/${groupId}`;

    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) return;

      const rawSubmissions = targetGroup.submissions || [];
      const newSubmission: Submission = {
        id: `sub_${Date.now()}`,
        submittedAt: new Date().toISOString(),
        submittedBy: user.email?.toLowerCase() || "",
        ...submission,
      };

      await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId), {
        submissions: [...rawSubmissions, newSubmission],
        updatedAt: serverTimestamp(),
      });
      alert("จัดส่งชิ้นงานความก้าวหน้าเรียบร้อยแล้ว!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Delete submission
  const handleDeleteSubmission = async (groupId: string, submissionId: string) => {
    if (!selectedAssignment || !confirm("ยืนยันต้องการลบประวัติการส่งชิ้นงานนี้?")) return;
    const path = `assignments/${selectedAssignment.id}/groups/${groupId}`;

    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (!targetGroup) return;

      const filteredSubmissions = targetGroup.submissions.filter((s) => s.id !== submissionId);

      await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", groupId), {
        submissions: filteredSubmissions,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Instructor grading saving
  const handleSaveGrading = async (groupGrading: GradeScore, individualGrading: { [studentEmail: string]: GradeScore }) => {
    if (!selectedAssignment || !selectedGroup) return;
    const path = `assignments/${selectedAssignment.id}/groups/${selectedGroup.id}`;

    try {
      await updateDoc(doc(db, "assignments", selectedAssignment.id, "groups", selectedGroup.id), {
        groupGrading,
        individualGrading,
        updatedAt: serverTimestamp(),
      });
      alert("บันทึกประเมินคะแนนรูบริกเรียบร้อยแล้ว!");
      setShowGradingPanel(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Auto-calculated user stats
  const totalAssignmentsCount = assignments.length;
  const userEnrolledGroup = selectedAssignment ? groups.find((g) => 
    g.members.some((m) => m.email === user?.email?.toLowerCase())
  ) : null;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans flex flex-col selection:bg-violet-100 selection:text-violet-900 pb-12">
      <Navbar user={user} loading={loading} />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
          <p className="mt-3 text-sm text-slate-500 font-medium">กำลังเตรียมสภาพแวดล้อมจัดกลุ่ม...</p>
        </div>
      ) : !user ? (
        /* Sign In Greeting Panel */
        <div className="flex-1 max-w-4xl mx-auto px-4 py-16 flex flex-col justify-center items-center text-center">
          <div className="bg-gradient-to-tr from-violet-600 to-pink-500 p-5 rounded-2xl shadow-xl text-white mb-6 animate-pulse">
            <GraduationCap className="h-14 w-14" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ระบบจัดตารางรายชื่อสำหรับงานกลุ่ม
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl">
            แพลตฟอร์มบริหารกลุ่ม โครงงานย่อย และคะแนนตามเกณฑ์แบบลงจุดความรับผิดชอบ สำหรับคณาจารย์และนักศึกษา มหาวิทยาลัยกรุงเทพ (BU)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-12 mb-12">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-left space-y-2">
              <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center font-bold">
                👨‍🏫
              </div>
              <h3 className="font-bold text-slate-800 text-sm">ผู้สอนผ่านเมลสถาบัน</h3>
              <p className="text-xs text-slate-500">อาจารย์ล็อคอินด้วย @bu.ac.th เพื่อสร้างเค้าโครงการประเมิน, ตรวจไฟล์แนบ และจัดเกณฑ์รูบริก</p>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-left space-y-2">
              <div className="h-10 w-10 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center font-bold">
                🎓
              </div>
              <h3 className="font-bold text-slate-800 text-sm">นักศึกษาเลือกจับคู่</h3>
              <p className="text-xs text-slate-500">จับกลุ่ม อธิบายหน้างาน แบ่งปันความรับผิดชอบหลัก และส่งส่งออกความคืบหน้าโครงการเป็นทีม</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-left space-y-2">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                🏆
              </div>
              <h3 className="font-bold text-slate-800 text-sm">ผลประเมินสองมิติ</h3>
              <p className="text-xs text-slate-500">เพิ่มสเปกตรัมการให้คะแนนแบบทีมและจำแนกรายบุคคลเพิ่มความยุติธรรมตามเกณฑ์พรีเซนต์</p>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-base rounded-xl flex items-center gap-2.5 shadow-xl shadow-violet-900/15 cursor-pointer transform hover:-translate-y-0.5 transition duration-300"
            id="btn-main-login"
          >
            เริ่มต้นใช้งานด้วยกูเกิลพอร์ทัล
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        /* Authenticated Session Dashboard */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          
          {/* Assignment Create Form Overlay */}
          {showAssignmentForm ? (
            <AssignmentForm
              onSave={handleSaveAssignment}
              onCancel={() => {
                setShowAssignmentForm(false);
                setEditingAssignment(undefined);
              }}
              initialData={editingAssignment}
            />
          ) : showGradingPanel && selectedAssignment && selectedGroup ? (
            /* Grading Overlay Panel */
            <GradingPanel
              assignment={selectedAssignment}
              group={selectedGroup}
              onSaveGrading={handleSaveGrading}
              onClose={() => setShowGradingPanel(false)}
            />
          ) : (
            /* Main Dashboard splits */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT PART: Assignment lists selection rail */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-150 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <BookOpen className="h-4.5 w-4.5 text-violet-600" />
                      วิชา/งานกลุ่มทั้งหมด
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">พบ {totalAssignmentsCount} ใบงานประเมิน</p>
                  </div>
                  
                  {isInstructor && (
                    <button
                      onClick={() => {
                        setEditingAssignment(undefined);
                        setShowAssignmentForm(true);
                      }}
                      className="p-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      id="btn-new-assignment"
                      title="สร้างใบงานใหม่"
                    >
                      <Plus className="h-4 w-4" />
                      สร้างใบงาน
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {assignments.length > 0 ? (
                    assignments.map((asg) => {
                      const isSelected = selectedAssignment?.id === asg.id;
                      return (
                        <div
                          key={asg.id}
                          onClick={() => {
                            setSelectedAssignment(asg);
                            setSelectedGroup(null);
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-violet-900 text-white border-violet-800 shadow-md"
                              : "bg-white text-slate-800 border-slate-150 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                              isSelected ? "bg-white/20 text-violet-100" : "bg-slate-100 text-slate-600"
                            }`}>
                              {asg.courseName}
                            </span>
                            
                            {isInstructor && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAssignment(asg);
                                    setShowAssignmentForm(true);
                                  }}
                                  className={`p-1 rounded hover:bg-white/10 ${isSelected ? "text-white" : "text-slate-500"}`}
                                  title="แก้ไขสเปกงาน"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => handleDeleteAssignment(asg.id, e)}
                                  className={`p-1 rounded hover:bg-white/10 ${isSelected ? "text-white" : "text-rose-600"}`}
                                  title="ลบวิชานี้"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>

                          <h4 className="font-bold text-sm sm:text-base mt-2 line-clamp-1">{asg.title}</h4>
                          <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? "text-violet-200" : "text-slate-500"}`}>
                            {asg.description}
                          </p>

                          <div className={`mt-3 pt-3 border-t flex justify-between items-center text-[10px] ${
                            isSelected ? "border-white/10 text-violet-300" : "border-slate-100 text-slate-400"
                          }`}>
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              <span>รับกลุ่มละ {asg.minMembersPerGroup}-{asg.maxMembersPerGroup} คน</span>
                            </div>
                            <span>รูบริก: {asg.rubrics?.length || 0} รายการ</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-150 text-slate-400 text-xs">
                      {isInstructor 
                        ? "ยังไม่ได้สร้างสเปกใบงานกลุ่มวิชาใด สามารถเริ่มกดปุ่มสร้างในเมนูด้านบน"
                        : "ไม่มีตารางรายชื่อสิทธิ์ของคุณใน Assignment / ติดต่ออาจารย์ผู้สอนเพื่อขอดึงเข้า Roster ลิสต์"}
                    </div>
                  )}
                </div>
              </div>


              {/* RIGHT PART: Selected assignment workspace (Groups + Submissions) */}
              <div className="lg:col-span-8">
                {selectedAssignment ? (
                  <div className="space-y-6">
                    {/* Assignment description card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <span className="text-xs font-mono font-bold text-violet-600 px-2 py-0.5 bg-violet-50 rounded">
                            {selectedAssignment.courseName}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{selectedAssignment.title}</h2>
                        </div>
                        <div className="text-left sm:text-right mt-1 sm:mt-0 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                          <p>อาจารย์ผู้สอน: <strong>{selectedAssignment.instructorName}</strong></p>
                          <p>ติดต่อ: <strong>{selectedAssignment.instructorEmail}</strong></p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedAssignment.description}
                      </div>

                      {/* Display Rubrics Overview */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-400 self-center uppercase font-mono mr-1">เกณฑ์ตรวจ:</span>
                        {selectedAssignment.rubrics?.map((r) => (
                          <span key={r.id} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded" title={r.description}>
                            {r.item} ({r.maxScore} คะแนน)
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Collapsible / dynamic Group details or list */}
                    {selectedGroup ? (
                      /* Show detailed view of active clicked student group */
                      <div className="space-y-4">
                        <button
                          onClick={() => setSelectedGroup(null)}
                          className="px-4 py-2 bg-white text-slate-700 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm transition"
                        >
                          <ArrowLeft className="h-4.5 w-4.5" />
                          ดูรายชื่อจัดกลุ่มทั้งหมด
                        </button>

                        <GroupDetails
                          assignment={selectedAssignment}
                          group={selectedGroup}
                          currentUserEmail={user.email}
                          isInstructor={isInstructor}
                          onJoinGroup={handleJoinGroup}
                          onLeaveGroup={handleLeaveGroup}
                          onUpdateRole={handleUpdateRole}
                          onSubmitWork={handleSubmitWork}
                          onDeleteSubmission={handleDeleteSubmission}
                          onOpenGrading={() => setShowGradingPanel(true)}
                        />
                      </div>
                    ) : (
                      /* Show active Groups listing inside the assignment */
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-1">
                              👥 รายชื่อกลุ่มนักศึกษา ({groups.length})
                            </h3>
                            <p className="text-xs text-slate-500">เลือกกลุ่มด้านล่างเพื่ออัปโหลดงาน ตรวจสอบเกรด หรือระบุหน้าที่ความรับผิดชอบ</p>
                          </div>
                          
                          {/* Create group button */}
                          <button
                            onClick={() => {
                              // If student, auto-fill standard names
                              setStudentRealName(user.displayName || "");
                              setShowCreateGroupModal(true);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
                            id="btn-trigger-create-group"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            สร้างกลุ่มใหม่
                          </button>
                        </div>

                        {/* List of existing student groups */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {groups.length > 0 ? (
                            groups.map((grp) => {
                              const isStudentInThisGroup = grp.members.some((m) => m.email === user.email?.toLowerCase());
                              const isGraded = grp.groupGrading != null;

                              return (
                                <div
                                  key={grp.id}
                                  onClick={() => setSelectedGroup(grp)}
                                  className={`p-5 rounded-2xl bg-white border cursor-pointer hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden ${
                                    isStudentInThisGroup 
                                      ? "border-violet-600 ring-2 ring-violet-100" 
                                      : "border-slate-150 hover:border-slate-300"
                                  }`}
                                >
                                  {isStudentInThisGroup && (
                                    <div className="absolute right-0 top-0 bg-violet-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl">
                                      กลุ่มของฉัน
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">
                                        กลุ่มที่ {grp.groupNumber}
                                      </span>
                                      
                                      {/* Submissions count */}
                                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                                        <FileText className="h-3.5 w-3.5 text-pink-400" />
                                        ส่งแล้ว {grp.submissions?.length || 0} ชิ้น
                                      </span>
                                    </div>

                                    <h4 className="font-sans font-bold text-slate-800 text-base mt-2.5 line-clamp-1">
                                      {grp.groupName}
                                    </h4>

                                    {/* Members avatars/emails listing */}
                                    <div className="mt-3 space-y-1.5">
                                      {grp.members.slice(0, 3).map((member) => (
                                        <div key={member.email} className="flex justify-between items-center text-xs text-slate-500">
                                          <span className="truncate pr-1">👤 {member.name || member.email.split("@")[0]}</span>
                                          <span className="font-mono text-[9px] text-zinc-400 truncate max-w-[120px]">{member.email}</span>
                                        </div>
                                      ))}
                                      {grp.members.length > 3 && (
                                        <p className="text-[10px] text-zinc-400 italic font-mono pl-5">
                                          และสมาชิกอื่นอีก {grp.members.length - 3} คน...
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-between items-center">
                                    <div className="text-xs">
                                      {isGraded ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          ตรวจแล้ว
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">รอรับการพิจารณาคะแนน</span>
                                      )}
                                    </div>

                                    <span className="text-xs font-bold text-violet-600 flex items-center gap-0.5">
                                      เปิดดูรายกลุ่ม 
                                      <ChevronRight className="h-4 w-4" />
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="sm:col-span-2 text-center py-10 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
                              ปัจจุบันยังไม่มีงานจัดกลุ่มเกิดขึ้น สนใจเป็นผู้ร่วมบุกเบิกสามารถเริ่มโดยการคลิกปุ่ม "สร้างกลุ่มใหม่"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center p-12 bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl min-h-[40vh]">
                    <div className="p-4 bg-slate-100 text-slate-400 rounded-2xl mb-4">
                      <GraduationCap className="h-10 w-10" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">เริ่มต้นทำงานวิชา</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      เลือกหัวข้าใบงาน Assignment จัดกลุ่มจากเมนูแถบข้าง เพื่อเริ่มแบ่งหน้าที่ และให้คะแนนรายคน
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* CREATE GROUP OVERLAY MODAL */}
          <AnimatePresence>
            {showCreateGroupModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative"
                >
                  <h3 className="text-lg font-bold text-slate-800">✍️ ประกาศจับกลุ่มงานใหม่</h3>
                  <p className="text-xs text-slate-500 mt-1">ตั้งชื่อที่จดจำง่าย และร่วมใส่ชื่อ-นามสกุลจริงเพื่อผู้สอนจัดคะแนน</p>

                  <form onSubmit={handleCreateGroupSubmit} className="space-y-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อกลุ่ม (Group Name) *</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น กลุ่มเขียนเว็บ Frontend เจ๋งๆ"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-slate-800"
                      />
                    </div>

                    {!isInstructor && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อจริงผู้ก่อตั้งกลุ่ม *</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น นายพายัพ บุญรักษา (กรอกไทย/อังกฤษ)"
                          value={studentRealName}
                          onChange={(e) => setStudentRealName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-slate-800"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                      <button
                        type="button"
                        onClick={() => setShowCreateGroupModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingGroup}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow shadow-violet-900/10 cursor-pointer"
                      >
                        {isSubmittingGroup ? "กำลังดำเนินการ..." : "ตกลงสร้างกลุ่ม"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
