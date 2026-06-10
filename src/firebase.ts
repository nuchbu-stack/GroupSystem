import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
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

export const dbStatus = {
  error: null as string | null,
  listeners: [] as ((error: string | null) => void)[],
  setError(err: string | null) {
    this.error = err;
    this.listeners.forEach((cb) => cb(err));
  },
  onChange(cb: (error: string | null) => void) {
    this.listeners.push(cb);
    cb(this.error);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== cb);
    };
  }
};

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
  
  dbStatus.setError(errorMessage);

  // Clean up error message for user
  let friendlyMsg = "เกิดข้อผิดพลาดในการบันทึกหรือดึงข้อมูล: " + errorMessage;
  if (errorMessage.toLowerCase().includes("permission-denied") || errorMessage.toLowerCase().includes("insufficient permissions")) {
    friendlyMsg = "ขออภัย คุณไม่มีสิทธิ์ในการดำเนินการนี้ (Permission Denied)\n\nโปรดตรวจสอบว่าคุณเข้าสู่ระบบด้วยอีเมลบัญชีผู้สอนที่ถูกต้อง (@bu.ac.th หรือได้รับสิทธิ์แล้ว)";
  } else if (errorMessage.toLowerCase().includes("quota-exceeded")) {
    friendlyMsg = "โควตาการใช้งานฐานข้อมูลเต็มแล้ว กรุณาลองใหม่อีกครั้งในวันถัดไป (Quota Exceeded)";
  } else if (errorMessage.toLowerCase().includes("offline") || errorMessage.toLowerCase().includes("failed-precondition") || errorMessage.toLowerCase().includes("unimplemented")) {
    friendlyMsg = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบว่าเปิดใช้งาน Firestore Database ในโครงการแล้วหรือยัง";
  }

  // Only alert for non-offline/non-configuration issues to avoid constant popups
  if (!errorMessage.toLowerCase().includes("offline") && !errorMessage.toLowerCase().includes("failed") && !errorMessage.toLowerCase().includes("unimplemented")) {
    try {
      alert(friendlyMsg);
    } catch (e) {
      // Ignore alert failures inside sandbox
    }
  }
  throw new Error(errInfo.error);
}

// Test connectivity on boot and offer retry
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    dbStatus.setError(null);
    return true;
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    
    // If it's a permission-denied error, it means we SUCCESSFULLY connected to the database 
    // and it rejected the read because of our security rules (which default to block unauthorized reads).
    // This confirms the database is online, created, and reachable!
    if (
      errStr.toLowerCase().includes("permission-denied") || 
      errStr.toLowerCase().includes("permission_denied") ||
      errStr.toLowerCase().includes("permissions") ||
      errStr.toLowerCase().includes("insufficient permissions")
    ) {
      dbStatus.setError(null);
      return true;
    }
    
    dbStatus.setError(errStr);
    if (error instanceof Error && (error.message.includes("offline") || error.message.includes("failed") || error.message.includes("unimplemented"))) {
      console.error("Please check your Firebase configuration or network status.");
    }
    return false;
  }
}
testConnection();
