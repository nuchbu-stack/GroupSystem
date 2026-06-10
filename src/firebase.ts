import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Must specify database id */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Check if user is on the allowed BU @bu.ac.th domain or other conditions
export function isUserInstructor(email: string | null): boolean {
  if (!email) return false;
  // Dynamic domains: instructor is @bu.ac.th or the specified test email
  const lowerEmail = email.toLowerCase();
  return lowerEmail.endsWith("@bu.ac.th") || lowerEmail === "nuch.bu@gmail.com";
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));

  // Clean up error message for user
  let friendlyMsg = "เกิดข้อผิดพลาดในการบันทึกหรือดึงข้อมูล: " + errorMessage;
  if (errorMessage.toLowerCase().includes("permission-denied") || errorMessage.toLowerCase().includes("insufficient permissions")) {
    friendlyMsg = "ขออภัย คุณไม่มีสิทธิ์ในการดำเนินการนี้ (Permission Denied)\n\nโปรดตรวจสอบว่าคุณเข้าสู่ระบบด้วยอีเมลบัญชีผู้สอนที่ถูกต้อง (@bu.ac.th หรือได้รับสิทธิ์แล้ว)";
  } else if (errorMessage.toLowerCase().includes("quota-exceeded")) {
    friendlyMsg = "โควตาการใช้งานฐานข้อมูลเต็มแล้ว กรุณาลองใหม่อีกครั้งในวันถัดไป (Quota Exceeded)";
  } else if (errorMessage.toLowerCase().includes("offline")) {
    friendlyMsg = "ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
  }

  alert(friendlyMsg);
  throw new Error(errInfo.error);
}

// Test connectivity on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();
