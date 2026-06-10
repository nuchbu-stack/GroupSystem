export interface RubricItem {
  id: string;
  item: string; // e.g. "ความสมบูรณ์ของเนื้อหา"
  description: string; // e.g. "เนื้อหามีความครบถ้วน ถูกต้องตามหัวข้อ"
  maxScore: number;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseName: string;
  maxMembersPerGroup: number;
  minMembersPerGroup: number;
  instructorEmail: string;
  instructorName: string;
  studentRoster: string[]; // List of students allowed to join
  rubrics: RubricItem[];
  createdAt: any;
  updatedAt: any;
}

export interface GroupMember {
  email: string;
  name: string;
  uid: string;
  roleDescription: string; // หน้าที่รับผิดชอบหลักในกลุ่ม
}

export interface Submission {
  id: string;
  submittedAt: string;
  fileName: string;
  fileDescription: string;
  fileUrl: string; // Simulating file link uploads (like PDF, GitHub repository, doc, etc.)
  submittedBy: string; // email of the student submitting
}

export interface GradeScore {
  rubricScores: { [rubricItemId: string]: number };
  feedback: string;
  gradedAt: string;
  gradedBy: string;
}

export interface Group {
  id: string;
  assignmentId: string;
  groupName: string;
  groupNumber: number;
  members: GroupMember[];
  submissions: Submission[];
  individualGrading?: { [studentEmail: string]: GradeScore };
  groupGrading?: GradeScore | null;
  createdAt: any;
  updatedAt: any;
}
