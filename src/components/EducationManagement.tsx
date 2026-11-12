import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, Building2, CalendarDays, CalendarCheck, Clock, GraduationCap, Layers3, Plus, RefreshCw, School, Users, ClipboardList, FileCheck2, UserRound, BarChart3 } from "lucide-react";
import EducationOperations from "./EducationOperations";
import EducationPortal from "./EducationPortal";
import { supabase } from "../lib/supabase";

type Institution = { id: string; institution_type: string; legal_name: string; short_name: string | null; affiliation: string | null; recognition_number: string | null; website: string | null; contact_email: string | null; contact_phone: string | null; established_year: number | null; verification_status: string };
type Campus = { id: string; name: string; code: string; city: string | null; state: string | null; is_primary: boolean; is_active: boolean };
type Department = { id: string; name: string; code: string; campus_id: string | null; hod_member_id: string | null; is_active: boolean };
type HodMember = { id: string; user_id: string };
type AcademicYear = { id: string; name: string; starts_on: string; ends_on: string; is_current: boolean; status: string };
type Program = { id: string; name: string; code: string; level: string; department_id: string | null; duration_semesters: number | null; total_seats: number | null; is_active: boolean };
type Batch = { id: string; name: string; code: string; program_id: string; academic_year_id: string; semester: number | null; section: string | null; status: string };
type Student = { id: string; admission_number: string; full_name: string; email: string | null; status: string; batch_id: string | null };
type Faculty = { id: string; employee_number: string; full_name: string; email: string | null; designation: string | null; employment_status: string };
type Subject = { id: string; name: string; code: string; program_id: string; semester: number | null; credits: number | null };
type TimetableEntry = { id: string; batch_id: string; subject_id: string; faculty_id: string; weekday: number; starts_at: string; ends_at: string; room: string | null };
type AttendanceSession = { id: string; batch_id: string; subject_id: string; faculty_id: string; session_date: string; starts_at: string | null; ends_at: string | null; status: string };
type AttendanceRecord = { id: string; session_id: string; student_id: string; attendance_status: string };

type Props = { organizationId: string };
type Tab = "Institution" | "Campuses" | "Departments" | "Academics" | "Students" | "Faculty" | "Timetable" | "Attendance" | "Admissions" | "Guardians" | "Documents" | "Examinations" | "Reports";

const tabs: { name: Tab; icon: typeof School }[] = [
  { name: "Institution", icon: School }, { name: "Campuses", icon: Building2 },
  { name: "Departments", icon: Layers3 }, { name: "Academics", icon: BookOpen },
  { name: "Students", icon: GraduationCap }, { name: "Faculty", icon: Users }, { name: "Timetable", icon: Clock }, { name: "Attendance", icon: CalendarCheck }, { name: "Admissions", icon: ClipboardList }, { name: "Guardians", icon: UserRound }, { name: "Documents", icon: FileCheck2 }, { name: "Examinations", icon: BookOpen }, { name: "Reports", icon: BarChart3 }
];

export default function EducationManagement({ organizationId }: Props) {
  const [tab, setTab] = useState<Tab>("Institution");
  const [memberRole, setMemberRole] = useState("");
  const visibleTabs: typeof tabs = memberRole === "hod" ? tabs.filter(item => !["Institution","Campuses","Guardians"].includes(item.name)) : tabs;
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hodMembers, setHodMembers] = useState<HodMember[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState("");
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string,string>>({});
  const [institutionType, setInstitutionType] = useState("college");
  const [legalName, setLegalName] = useState("");
  const [shortName, setShortName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [recognitionNumber, setRecognitionNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [campusName, setCampusName] = useState("");
  const [campusCode, setCampusCode] = useState("");
  const [campusCity, setCampusCity] = useState("");
  const [campusState, setCampusState] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentCampus, setDepartmentCampus] = useState("");
  const [departmentHod, setDepartmentHod] = useState("");
  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [programName, setProgramName] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [programLevel, setProgramLevel] = useState("diploma");
  const [programDepartment, setProgramDepartment] = useState("");
  const [programDuration, setProgramDuration] = useState("6");
  const [programSeats, setProgramSeats] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectProgram, setSubjectProgram] = useState("");
  const [subjectSemester, setSubjectSemester] = useState("1");
  const [subjectCredits, setSubjectCredits] = useState("3");
  const [batchName, setBatchName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [batchProgram, setBatchProgram] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [batchSemester, setBatchSemester] = useState("1");
  const [batchSection, setBatchSection] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentGuardian, setStudentGuardian] = useState("");
  const [studentGuardianPhone, setStudentGuardianPhone] = useState("");
  const [studentBatch, setStudentBatch] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyDesignation, setFacultyDesignation] = useState("");
  const [facultyDepartment, setFacultyDepartment] = useState("");
  const [timetableBatch, setTimetableBatch] = useState("");
  const [timetableSubject, setTimetableSubject] = useState("");
  const [timetableFaculty, setTimetableFaculty] = useState("");
  const [timetableWeekday, setTimetableWeekday] = useState("1");
  const [timetableStart, setTimetableStart] = useState("09:00");
  const [timetableEnd, setTimetableEnd] = useState("10:00");
  const [timetableRoom, setTimetableRoom] = useState("");
  const [attendanceBatch, setAttendanceBatch] = useState("");
  const [attendanceSubject, setAttendanceSubject] = useState("");
  const [attendanceFaculty, setAttendanceFaculty] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0,10));
  const [attendanceStart, setAttendanceStart] = useState("09:00");
  const [attendanceEnd, setAttendanceEnd] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [studentInviteLink, setStudentInviteLink] = useState("");
  const [facultyInviteLink, setFacultyInviteLink] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !organizationId) return;
    setBusy(true); setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in to access institution management.");
      const { data: member, error: memberError } = await supabase.from("organization_members")
        .select("role").eq("organization_id", organizationId).eq("user_id", authData.user.id).eq("status", "active").maybeSingle();
      if (memberError) throw memberError;
      if (!member) throw new Error("An active organization membership is required.");
      setMemberRole(member.role);
      if (["teacher","student","parent"].includes(member.role)) return;
      if (!["owner","admin","manager","principal","hod"].includes(member.role)) {
        throw new Error("Your organization role does not have access to the education workspace.");
      }
      const results = await Promise.all([
        supabase.from("education_institutions").select("*").eq("organization_id", organizationId).maybeSingle(),
        supabase.from("education_campuses").select("id,name,code,city,state,is_primary,is_active").eq("organization_id", organizationId).order("name"),
        supabase.from("education_departments").select("id,name,code,campus_id,hod_member_id,is_active").eq("organization_id", organizationId).order("name"),
        supabase.from("education_academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("organization_id", organizationId).order("starts_on", { ascending: false }),
        supabase.from("education_programs").select("id,name,code,level,department_id,duration_semesters,total_seats,is_active").eq("organization_id", organizationId).order("name"),
        supabase.from("education_batches").select("id,name,code,program_id,academic_year_id,semester,section,status").eq("organization_id", organizationId).order("name"),
        supabase.from("education_students").select("id,admission_number,full_name,email,status,batch_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
        supabase.from("education_faculty").select("id,employee_number,full_name,email,designation,employment_status").eq("organization_id", organizationId).order("full_name").limit(100),
        supabase.from("education_subjects").select("id,name,code,program_id,semester,credits").eq("organization_id", organizationId).order("name"),
        supabase.from("education_timetable_entries").select("id,batch_id,subject_id,faculty_id,weekday,starts_at,ends_at,room").eq("organization_id", organizationId).order("weekday"),
        supabase.from("education_attendance_sessions").select("id,batch_id,subject_id,faculty_id,session_date,starts_at,ends_at,status").eq("organization_id", organizationId).order("session_date", { ascending: false }).limit(100),
        supabase.from("education_attendance_records").select("id,session_id,student_id,attendance_status").eq("organization_id", organizationId).limit(1000)
      ]);
      for (const result of results) if (result.error) throw result.error;
      const inst = results[0].data as Institution | null;
      setInstitution(inst);
      if (inst) {
        setInstitutionType(inst.institution_type); setLegalName(inst.legal_name);
        setShortName(inst.short_name ?? ""); setAffiliation(inst.affiliation ?? "");
        setRecognitionNumber(inst.recognition_number ?? ""); setWebsite(inst.website ?? "");
        setContactEmail(inst.contact_email ?? ""); setContactPhone(inst.contact_phone ?? "");
        setEstablishedYear(inst.established_year ? String(inst.established_year) : "");
      }
      setCampuses((results[1].data ?? []) as Campus[]);
      setDepartments((results[2].data ?? []) as Department[]);
      const { data: hodRows, error: hodError } = await supabase.from("organization_members").select("id,user_id").eq("organization_id", organizationId).eq("role", "hod").eq("status", "active");
      if (hodError) throw hodError;
      setHodMembers((hodRows ?? []) as HodMember[]);
      setYears((results[3].data ?? []) as AcademicYear[]);
      setPrograms((results[4].data ?? []) as Program[]);
      setBatches((results[5].data ?? []) as Batch[]);
      setStudents((results[6].data ?? []) as Student[]);
      setFaculty((results[7].data ?? []) as Faculty[]);
      setSubjects((results[8].data ?? []) as Subject[]);
      setTimetableEntries((results[9].data ?? []) as TimetableEntry[]);
      setAttendanceSessions((results[10].data ?? []) as AttendanceSession[]);
      setAttendanceRecords((results[11].data ?? []) as AttendanceRecord[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Education records could not be loaded.");
    } finally { setBusy(false); }
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (memberRole === "hod" && ["Institution","Campuses","Guardians"].includes(tab)) setTab("Departments"); }, [memberRole, tab]);

  async function submit(event: FormEvent, action: () => Promise<void>) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); await load(); setNotice("Changes saved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The operation failed."); }
    finally { setBusy(false); }
  }

  async function saveInstitution(event: FormEvent) {
    await submit(event, async () => {
      if (legalName.trim().length < 2) throw new Error("Enter the legal institution name.");
      const { error: e } = await supabase!.from("education_institutions").upsert({
        organization_id: organizationId, institution_type: institutionType, legal_name: legalName.trim(),
        short_name: shortName.trim() || null, affiliation: affiliation.trim() || null,
        recognition_number: recognitionNumber.trim() || null, website: website.trim() || null,
        contact_email: contactEmail.trim() || null, contact_phone: contactPhone.trim() || null,
        established_year: establishedYear ? Number(establishedYear) : null
      }, { onConflict: "organization_id" });
      if (e) throw e;
    });
  }

  async function createCampus(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.from("education_campuses").insert({
        organization_id: organizationId, name: campusName.trim(), code: campusCode.trim().toUpperCase(),
        city: campusCity.trim() || null, state: campusState.trim() || null,
        address: campusAddress.trim() || null, is_primary: campuses.length === 0
      });
      if (e) throw e;
      setCampusName(""); setCampusCode(""); setCampusCity(""); setCampusState(""); setCampusAddress("");
    });
  }

  async function createDepartment(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.from("education_departments").insert({
        organization_id: organizationId, name: departmentName.trim(), code: departmentCode.trim().toUpperCase(),
        campus_id: departmentCampus || null, hod_member_id: departmentHod || null
      });
      if (e) throw e;
      setDepartmentName(""); setDepartmentCode(""); setDepartmentCampus(""); setDepartmentHod("");
    });
  }

  async function updateDepartmentHod(departmentId: string, memberId: string) {
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error: e } = await supabase.from("education_departments").update({ hod_member_id: memberId || null }).eq("organization_id", organizationId).eq("id", departmentId);
    if (e) setError(e.message); else { setNotice("HOD assignment updated."); await load(); }
    setBusy(false);
  }

  async function createYear(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.from("education_academic_years").insert({
        organization_id: organizationId, name: yearName.trim(), starts_on: yearStart, ends_on: yearEnd,
        status: years.some(y => y.is_current && y.status === "active") ? "planned" : "active", is_current: !years.some(y => y.is_current && y.status === "active")
      });
      if (e) throw e;
      setYearName(""); setYearStart(""); setYearEnd("");
    });
  }

  async function createProgram(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.from("education_programs").insert({
        organization_id: organizationId, name: programName.trim(), code: programCode.trim().toUpperCase(),
        level: programLevel, department_id: programDepartment || null,
        duration_semesters: programDuration ? Number(programDuration) : null,
        total_seats: programSeats ? Number(programSeats) : null
      });
      if (e) throw e;
      setProgramName(""); setProgramCode(""); setProgramSeats("");
    });
  }

  async function createSubject(event: FormEvent) {
    await submit(event, async () => {
      if (!subjectProgram) throw new Error("Select a programme for this subject.");
      const { error: e } = await supabase!.from("education_subjects").insert({
        organization_id: organizationId, name: subjectName.trim(), code: subjectCode.trim().toUpperCase(),
        program_id: subjectProgram, semester: subjectSemester ? Number(subjectSemester) : null,
        credits: subjectCredits ? Number(subjectCredits) : null
      });
      if (e) throw e;
      setSubjectName(""); setSubjectCode("");
    });
  }

  async function createTimetableEntry(event: FormEvent) {
    await submit(event, async () => {
      if (!timetableBatch || !timetableSubject || !timetableFaculty) throw new Error("Select batch, subject and faculty.");
      const { error: e } = await supabase!.from("education_timetable_entries").insert({
        organization_id: organizationId, batch_id: timetableBatch, subject_id: timetableSubject,
        faculty_id: timetableFaculty, weekday: Number(timetableWeekday),
        starts_at: timetableStart, ends_at: timetableEnd, room: timetableRoom.trim() || null
      });
      if (e) throw e;
      setTimetableRoom("");
    });
  }

  async function createAttendanceSession(event: FormEvent) {
    await submit(event, async () => {
      if (!attendanceBatch || !attendanceSubject || !attendanceFaculty) throw new Error("Select batch, subject and faculty.");
      const { data, error: e } = await supabase!.from("education_attendance_sessions").insert({
        organization_id: organizationId, batch_id: attendanceBatch, subject_id: attendanceSubject,
        faculty_id: attendanceFaculty, session_date: attendanceDate,
        starts_at: attendanceStart, ends_at: attendanceEnd, status: "open"
      }).select("id").single();
      if (e) throw e;
      if (data?.id) setSelectedAttendanceSession(data.id);
    });
  }

  async function saveAttendance() {
    if (!supabase || !selectedAttendanceSession) return;
    const session = attendanceSessions.find(s => s.id === selectedAttendanceSession);
    if (!session) { setError("Select an attendance session."); return; }
    const roster = students.filter(student => student.batch_id === session.batch_id);
    if (!roster.length) { setError("No students are assigned to this batch yet."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const rows = roster.map(student => ({
        organization_id: organizationId, session_id: session.id, student_id: student.id,
        attendance_status: attendanceMarks[student.id] || "present", marked_by: authData.user?.id ?? null
      }));
      const { error: saveError } = await supabase.from("education_attendance_records")
        .upsert(rows, { onConflict: "organization_id,session_id,student_id" });
      if (saveError) throw saveError;
      const { error: updateError } = await supabase.from("education_attendance_sessions")
        .update({ status: "submitted" }).eq("organization_id", organizationId).eq("id", session.id);
      if (updateError) throw updateError;
      setNotice("Attendance saved for the selected batch.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attendance could not be saved.");
    } finally { setBusy(false); }
  }

  async function createBatch(event: FormEvent) {
    await submit(event, async () => {
      if (!batchProgram || !batchYear) throw new Error("Select both a programme and an academic year.");
      const { error: e } = await supabase!.from("education_batches").insert({
        organization_id: organizationId, name: batchName.trim(), code: batchCode.trim().toUpperCase(),
        program_id: batchProgram, academic_year_id: batchYear,
        semester: batchSemester ? Number(batchSemester) : null, section: batchSection.trim() || null
      });
      if (e) throw e;
      setBatchName(""); setBatchCode(""); setBatchSection("");
    });
  }

  async function createStudent(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.rpc("admit_education_student", {
        admission_number: studentNumber.trim().toUpperCase(), full_name: studentName.trim(),
        student_email: studentEmail.trim() || null, student_phone: studentPhone.trim() || null,
        guardian_name: studentGuardian.trim() || null, guardian_phone: studentGuardianPhone.trim() || null,
        target_batch_id: studentBatch || null
      });
      if (e) throw e;
      if (studentEmail.trim()) {
        const { data: invite, error: inviteError } = await supabase!.rpc("create_organization_invitation", {
          target_org: organizationId, invite_email: studentEmail.trim().toLowerCase(), invite_role: "student", expires_in_days: 7
        });
        if (inviteError) throw new Error("Student record created, but the login invitation failed: " + inviteError.message);
        const row = Array.isArray(invite) ? invite[0] : invite;
        if (row?.invitation_token) setStudentInviteLink(window.location.origin + "/#invite=" + row.invitation_token);
      }
      setStudentNumber(""); setStudentName(""); setStudentEmail(""); setStudentPhone("");
      setStudentGuardian(""); setStudentGuardianPhone("");
    });
  }

  async function createFaculty(event: FormEvent) {
    await submit(event, async () => {
      const { error: e } = await supabase!.from("education_faculty").insert({
        organization_id: organizationId, employee_number: employeeNumber.trim().toUpperCase(),
        full_name: facultyName.trim(), email: facultyEmail.trim() || null,
        designation: facultyDesignation.trim() || null, department_id: facultyDepartment || null
      });
      if (e) throw e;
      if (facultyEmail.trim()) {
        const { data: invite, error: inviteError } = await supabase!.rpc("create_organization_invitation", {
          target_org: organizationId, invite_email: facultyEmail.trim().toLowerCase(), invite_role: "teacher", expires_in_days: 7
        });
        if (inviteError) throw new Error("Faculty record created, but the teacher login invitation failed: " + inviteError.message);
        const row = Array.isArray(invite) ? invite[0] : invite;
        if (row?.invitation_token) setFacultyInviteLink(window.location.origin + "/#invite=" + row.invitation_token);
      }
      setEmployeeNumber(""); setFacultyName(""); setFacultyEmail(""); setFacultyDesignation("");
    });
  }

  const departmentLabel = (id: string | null) => departments.find(d => d.id === id)?.name ?? "Unassigned";
  const programLabel = (id: string) => programs.find(p => p.id === id)?.name ?? "Programme";
  const yearLabel = (id: string) => years.find(y => y.id === id)?.name ?? "Academic year";

  if (["teacher","student","parent"].includes(memberRole)) {
    return <EducationPortal organizationId={organizationId} role={memberRole as "teacher" | "student" | "parent"} />;
  }

  return (
    <section className="education-page">
      <header className="education-heading">
        <div><p className="eyebrow">MONK EDUCATION</p><h2>Institution management</h2><p className="muted">Build the academic structure of this organization. All records are tenant-isolated.</p></div>
        <button className="education-refresh" onClick={() => void load()} disabled={busy}><RefreshCw size={14}/> Refresh</button>
      </header>
      {error && <div className="education-alert error" role="alert">{error}</div>}
      {notice && <div className="education-alert" role="status">{notice}</div>}
      {busy && <div className="education-loading"><RefreshCw size={13}/> Syncing education records…</div>}
      <div className="education-metrics">
        <article><School size={17}/><strong>{institution ? "1" : "0"}</strong><span>Institution profile</span></article>
        <article><Building2 size={17}/><strong>{campuses.length}</strong><span>Campuses</span></article>
        <article><Layers3 size={17}/><strong>{departments.length}</strong><span>Departments</span></article>
        <article><GraduationCap size={17}/><strong>{students.length}</strong><span>Students</span></article>
      </div>
      <nav className="education-tabs" aria-label="Education modules">{visibleTabs.map(item => <button key={item.name} className={tab === item.name ? "active" : ""} onClick={() => setTab(item.name)}><item.icon size={15}/>{item.name}</button>)}</nav>

      {tab === "Institution" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={saveInstitution}>
          <div className="education-card-heading"><School size={17}/><div><b>Institution profile</b><small>Official identity and affiliation</small></div></div>
          <label>Institution type<select value={institutionType} onChange={e => setInstitutionType(e.target.value)}>{["school","college","university","polytechnic","coaching","training_center"].map(v => <option key={v} value={v}>{v.replace("_"," ")}</option>)}</select></label>
          <label>Legal institution name<input required minLength={2} maxLength={180} value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Full registered name"/></label>
          <label>Short name<input maxLength={80} value={shortName} onChange={e => setShortName(e.target.value)} placeholder="Common name"/></label>
          <label>Affiliation / Board<input maxLength={160} value={affiliation} onChange={e => setAffiliation(e.target.value)} placeholder="SBTE Bihar, BSEB, AICTE…"/></label>
          <label>Recognition / registration number<input maxLength={100} value={recognitionNumber} onChange={e => setRecognitionNumber(e.target.value)} /></label>
          <div className="education-two"><label>Contact email<input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}/></label><label>Phone<input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}/></label></div>
          <div className="education-two"><label>Website<input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://"/></label><label>Established year<input type="number" min="1800" max={new Date().getFullYear()} value={establishedYear} onChange={e => setEstablishedYear(e.target.value)}/></label></div>
          {institution && <p className="education-verification">Verification status: <b>{institution.verification_status}</b>. Verification is not automatic.</p>}
          <button className="primary" disabled={busy}><Plus size={15}/>{institution ? "Update institution" : "Save institution profile"}</button>
        </form>
        <aside className="education-card education-guidance"><h3>Institution setup checklist</h3>
          <p><span className={institution ? "done" : ""}>{institution ? "✓" : "1"}</span> Register institution profile</p>
          <p><span className={campuses.length ? "done" : ""}>{campuses.length ? "✓" : "2"}</span> Add the primary campus</p>
          <p><span className={departments.length ? "done" : ""}>{departments.length ? "✓" : "3"}</span> Create departments</p>
          <p><span className={years.length ? "done" : ""}>{years.length ? "✓" : "4"}</span> Configure academic year</p>
          <p><span className={programs.length ? "done" : ""}>{programs.length ? "✓" : "5"}</span> Add programmes and batches</p>
          <small>Only records entered by an authorized institution administrator appear here. No sample records are inserted.</small>
        </aside>
      </div>}

      {tab === "Campuses" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createCampus}><div className="education-card-heading"><Building2 size={17}/><div><b>Add campus</b><small>Create a tenant-owned campus location</small></div></div>
          <label>Campus name<input required minLength={2} maxLength={120} value={campusName} onChange={e => setCampusName(e.target.value)}/></label>
          <label>Campus code<input required minLength={2} maxLength={20} value={campusCode} onChange={e => setCampusCode(e.target.value.toUpperCase())}/></label>
          <label>Address<input value={campusAddress} onChange={e => setCampusAddress(e.target.value)}/></label>
          <div className="education-two"><label>City<input value={campusCity} onChange={e => setCampusCity(e.target.value)}/></label><label>State<input value={campusState} onChange={e => setCampusState(e.target.value)}/></label></div>
          <button className="primary" disabled={busy}><Plus size={15}/> Add campus</button>
        </form>
        <div className="education-card"><h3>Registered campuses <span>{campuses.length}</span></h3>{campuses.map(c => <div className="education-record" key={c.id}><Building2 size={16}/><div><b>{c.name}</b><small>{c.code} · {[c.city,c.state].filter(Boolean).join(", ") || "Address not set"}</small></div>{c.is_primary && <em>Primary</em>}</div>)}{!campuses.length && <p className="education-empty">No campus records yet.</p>}</div>
      </div>}

      {tab === "Departments" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createDepartment}><div className="education-card-heading"><Layers3 size={17}/><div><b>Create department</b><small>Academic department or division</small></div></div>
          <label>Department name<input required minLength={2} maxLength={120} value={departmentName} onChange={e => setDepartmentName(e.target.value)}/></label>
          <label>Department code<input required minLength={2} maxLength={20} value={departmentCode} onChange={e => setDepartmentCode(e.target.value.toUpperCase())}/></label>
          <label>Campus<select value={departmentCampus} onChange={e => setDepartmentCampus(e.target.value)}><option value="">Organization-wide</option>{campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Head of department<select value={departmentHod} onChange={e => setDepartmentHod(e.target.value)}><option value="">Not assigned</option>{hodMembers.map(m => <option key={m.id} value={m.id}>HOD account {m.user_id.slice(0,8)}</option>)}</select></label>
          <button className="primary" disabled={busy}><Plus size={15}/> Create department</button>
        </form>
        <div className="education-card"><h3>Departments <span>{departments.length}</span></h3>{departments.map(d => <div className="education-record" key={d.id}><Layers3 size={16}/><div><b>{d.name}</b><small>{d.code} · {campuses.find(c => c.id === d.campus_id)?.name ?? "All campuses"}</small><select aria-label={"HOD for "+d.name} value={d.hod_member_id ?? ""} onChange={e=>void updateDepartmentHod(d.id,e.target.value)}><option value="">Assign HOD</option>{hodMembers.map(m=><option key={m.id} value={m.id}>Account {m.user_id.slice(0,8)}</option>)}</select></div></div>)}{!departments.length && <p className="education-empty">No departments created yet.</p>}</div>
      </div>}

      {tab === "Academics" && <div className="education-academics">
        <div className="education-grid">
          <form className="education-card education-form" onSubmit={createYear}><div className="education-card-heading"><CalendarDays size={17}/><div><b>Academic year</b><small>Set the active academic calendar</small></div></div>
            <label>Academic year name<input required value={yearName} onChange={e => setYearName(e.target.value)} placeholder="2026–27"/></label>
            <div className="education-two"><label>Start date<input required type="date" value={yearStart} onChange={e => setYearStart(e.target.value)}/></label><label>End date<input required type="date" min={yearStart || undefined} value={yearEnd} onChange={e => setYearEnd(e.target.value)}/></label></div>
            <button className="primary" disabled={busy}><Plus size={15}/> Add academic year</button>
          </form>
          <form className="education-card education-form" onSubmit={createProgram}><div className="education-card-heading"><BookOpen size={17}/><div><b>Programme / course</b><small>Academic offering</small></div></div>
            <label>Programme name<input required value={programName} onChange={e => setProgramName(e.target.value)} placeholder="Diploma in Mechanical Engineering"/></label>
            <label>Programme code<input required value={programCode} onChange={e => setProgramCode(e.target.value.toUpperCase())}/></label>
            <label>Level<select value={programLevel} onChange={e => setProgramLevel(e.target.value)}>{["school","certificate","diploma","undergraduate","postgraduate","doctoral","coaching","other"].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
            <label>Department<select value={programDepartment} onChange={e => setProgramDepartment(e.target.value)}><option value="">No department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <div className="education-two"><label>Duration (semesters)<input type="number" min="1" max="20" value={programDuration} onChange={e => setProgramDuration(e.target.value)}/></label><label>Total seats<input type="number" min="0" value={programSeats} onChange={e => setProgramSeats(e.target.value)}/></label></div>
            <button className="primary" disabled={busy}><Plus size={15}/> Add programme</button>
          </form>
        </div>
        <div className="education-card education-wide-list"><h3>Academic years <span>{years.length}</span></h3>{years.map(y => <div className="education-record" key={y.id}><CalendarDays size={16}/><div><b>{y.name}</b><small>{y.starts_on} — {y.ends_on}</small></div>{y.is_current && <em>Current</em>}</div>)}{!years.length && <p className="education-empty">No academic years configured.</p>}</div>
        <div className="education-grid">
          <div className="education-card"><h3>Programmes <span>{programs.length}</span></h3>{programs.map(p => <div className="education-record" key={p.id}><BookOpen size={16}/><div><b>{p.name}</b><small>{p.code} · {p.level} · {departmentLabel(p.department_id)}</small></div></div>)}{!programs.length && <p className="education-empty">No programmes created.</p>}</div>
          <form className="education-card education-form" onSubmit={createBatch}><div className="education-card-heading"><GraduationCap size={17}/><div><b>Create batch / class</b><small>Connect a programme to an academic year</small></div></div>
            <label>Batch name<input required value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="2026 Mechanical A"/></label>
            <label>Batch code<input required value={batchCode} onChange={e => setBatchCode(e.target.value.toUpperCase())}/></label>
            <label>Programme<select required value={batchProgram} onChange={e => setBatchProgram(e.target.value)}><option value="">Select programme</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Academic year<select required value={batchYear} onChange={e => setBatchYear(e.target.value)}><option value="">Select year</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
            <div className="education-two"><label>Semester / class<input type="number" min="1" max="20" value={batchSemester} onChange={e => setBatchSemester(e.target.value)}/></label><label>Section<input value={batchSection} onChange={e => setBatchSection(e.target.value)} placeholder="A"/></label></div>
            <button className="primary" disabled={busy || !programs.length || !years.length}><Plus size={15}/> Create batch</button>
          </form>
        </div>
        <div className="education-card education-wide-list"><h3>Batches <span>{batches.length}</span></h3>{batches.map(b => <div className="education-record" key={b.id}><GraduationCap size={16}/><div><b>{b.name}</b><small>{b.code} · {programLabel(b.program_id)} · {yearLabel(b.academic_year_id)}{b.semester ? ` · Semester ${b.semester}` : ""}</small></div></div>)}{!batches.length && <p className="education-empty">No batches created.</p>}</div>
        <div className="education-grid">
          <form className="education-card education-form" onSubmit={createSubject}><div className="education-card-heading"><BookOpen size={17}/><div><b>Create subject</b><small>Map a subject to a programme and semester</small></div></div>
            <label>Subject name<input required value={subjectName} onChange={e => setSubjectName(e.target.value)}/></label>
            <label>Subject code<input required value={subjectCode} onChange={e => setSubjectCode(e.target.value.toUpperCase())}/></label>
            <label>Programme<select required value={subjectProgram} onChange={e => setSubjectProgram(e.target.value)}><option value="">Select programme</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="education-two"><label>Semester<input type="number" min="1" max="20" value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)}/></label><label>Credits<input type="number" min="0" step="0.5" value={subjectCredits} onChange={e => setSubjectCredits(e.target.value)}/></label></div>
            <button className="primary" disabled={busy || !programs.length}><Plus size={15}/> Add subject</button>
          </form>
          <div className="education-card"><h3>Subjects <span>{subjects.length}</span></h3>{subjects.map(s => <div className="education-record" key={s.id}><BookOpen size={16}/><div><b>{s.name}</b><small>{s.code} · {programLabel(s.program_id)}{s.semester ? ` · Semester ${s.semester}` : ""}</small></div></div>)}{!subjects.length && <p className="education-empty">No subjects created yet.</p>}</div>
        </div>
      </div>}

      {tab === "Students" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createStudent}><div className="education-card-heading"><GraduationCap size={17}/><div><b>Student admission record</b><small>Store a student profile in this institution</small></div></div>
          <label>Admission / roll number<input required value={studentNumber} onChange={e => setStudentNumber(e.target.value.toUpperCase())}/></label>
          <label>Student full name<input required minLength={2} value={studentName} onChange={e => setStudentName(e.target.value)}/></label>
          <div className="education-two"><label>Email<input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)}/></label><label>Phone<input type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)}/></label></div>
          <label>Batch<select value={studentBatch} onChange={e => setStudentBatch(e.target.value)}><option value="">Not assigned</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <div className="education-two"><label>Guardian name<input value={studentGuardian} onChange={e => setStudentGuardian(e.target.value)}/></label><label>Guardian phone<input type="tel" value={studentGuardianPhone} onChange={e => setStudentGuardianPhone(e.target.value)}/></label></div>
          <button className="primary" disabled={busy}><Plus size={15}/> Add student</button>
          {studentInviteLink && <div className="invite-link"><input readOnly value={studentInviteLink}/><button type="button" onClick={() => void navigator.clipboard.writeText(studentInviteLink)}>Copy student login link</button></div>}
        </form>
        <div className="education-card"><h3>Student records <span>{students.length}{students.length === 100 ? "+" : ""}</span></h3>{students.map(s => <div className="education-record" key={s.id}><GraduationCap size={16}/><div><b>{s.full_name}</b><small>{s.admission_number} · {s.email ?? "No email"} · {s.status}</small></div></div>)}{!students.length && <p className="education-empty">No student records yet. Records are not imported or fabricated.</p>}</div>
      </div>}

      {tab === "Faculty" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createFaculty}><div className="education-card-heading"><Users size={17}/><div><b>Faculty / teacher record</b><small>Register teaching and academic staff</small></div></div>
          <label>Employee number<input required value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value.toUpperCase())}/></label>
          <label>Full name<input required minLength={2} value={facultyName} onChange={e => setFacultyName(e.target.value)}/></label>
          <div className="education-two"><label>Email<input type="email" value={facultyEmail} onChange={e => setFacultyEmail(e.target.value)}/></label><label>Designation<input value={facultyDesignation} onChange={e => setFacultyDesignation(e.target.value)} placeholder="Lecturer / HOD"/></label></div>
          <label>Department<select value={facultyDepartment} onChange={e => setFacultyDepartment(e.target.value)}><option value="">Unassigned</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <button className="primary" disabled={busy}><Plus size={15}/> Add faculty</button>
          {facultyInviteLink && <div className="invite-link"><input readOnly value={facultyInviteLink}/><button type="button" onClick={() => void navigator.clipboard.writeText(facultyInviteLink)}>Copy teacher login link</button></div>}
        </form>
        <div className="education-card"><h3>Faculty records <span>{faculty.length}{faculty.length === 100 ? "+" : ""}</span></h3>{faculty.map(f => <div className="education-record" key={f.id}><Users size={16}/><div><b>{f.full_name}</b><small>{f.employee_number} · {f.designation ?? departmentLabel(null)} · {f.employment_status}</small></div></div>)}{!faculty.length && <p className="education-empty">No faculty records yet.</p>}</div>
      </div>}

      {tab === "Timetable" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createTimetableEntry}><div className="education-card-heading"><Clock size={17}/><div><b>Schedule a class</b><small>Assign a subject and faculty to a batch</small></div></div>
          <label>Batch / class<select required value={timetableBatch} onChange={e => setTimetableBatch(e.target.value)}><option value="">Select batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>Subject<select required value={timetableSubject} onChange={e => setTimetableSubject(e.target.value)}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Faculty<select required value={timetableFaculty} onChange={e => setTimetableFaculty(e.target.value)}><option value="">Select faculty</option>{faculty.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}</select></label>
          <label>Weekday<select value={timetableWeekday} onChange={e => setTimetableWeekday(e.target.value)}>{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day,i) => <option key={day} value={String(i+1)}>{day}</option>)}</select></label>
          <div className="education-two"><label>Start time<input required type="time" value={timetableStart} onChange={e => setTimetableStart(e.target.value)}/></label><label>End time<input required type="time" value={timetableEnd} onChange={e => setTimetableEnd(e.target.value)}/></label></div>
          <label>Room / lab<input value={timetableRoom} onChange={e => setTimetableRoom(e.target.value)} placeholder="Room 204 / Workshop"/></label>
          <button className="primary" disabled={busy || !batches.length || !subjects.length || !faculty.length}><Plus size={15}/> Add timetable slot</button>
        </form>
        <div className="education-card"><h3>Timetable entries <span>{timetableEntries.length}</span></h3>{timetableEntries.map(entry => <div className="education-record" key={entry.id}><Clock size={16}/><div><b>{batches.find(b => b.id === entry.batch_id)?.name ?? "Batch"} · {subjects.find(s => s.id === entry.subject_id)?.name ?? "Subject"}</b><small>{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][entry.weekday-1]} · {entry.starts_at.slice(0,5)}–{entry.ends_at.slice(0,5)} · {faculty.find(v => v.id === entry.faculty_id)?.full_name ?? "Faculty"}{entry.room ? ` · ${entry.room}` : ""}</small></div></div>)}{!timetableEntries.length && <p className="education-empty">No timetable slots configured.</p>}</div>
      </div>}

      {tab === "Attendance" && <div className="education-grid">
        <form className="education-card education-form" onSubmit={createAttendanceSession}><div className="education-card-heading"><CalendarCheck size={17}/><div><b>Start attendance session</b><small>Create a dated class register</small></div></div>
          <label>Batch / class<select required value={attendanceBatch} onChange={e => setAttendanceBatch(e.target.value)}><option value="">Select batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>Subject<select required value={attendanceSubject} onChange={e => setAttendanceSubject(e.target.value)}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Faculty<select required value={attendanceFaculty} onChange={e => setAttendanceFaculty(e.target.value)}><option value="">Select faculty</option>{faculty.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}</select></label>
          <label>Session date<input required type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}/></label>
          <div className="education-two"><label>Start time<input type="time" value={attendanceStart} onChange={e => setAttendanceStart(e.target.value)}/></label><label>End time<input type="time" value={attendanceEnd} onChange={e => setAttendanceEnd(e.target.value)}/></label></div>
          <button className="primary" disabled={busy || !batches.length || !subjects.length || !faculty.length}><Plus size={15}/> Create attendance session</button>
        </form>
        <div className="education-card"><h3>Attendance sessions <span>{attendanceSessions.length}</span></h3>{attendanceSessions.map(s => <button type="button" key={s.id} className={selectedAttendanceSession === s.id ? "education-session selected" : "education-session"} onClick={() => {setSelectedAttendanceSession(s.id);setAttendanceMarks(Object.fromEntries(attendanceRecords.filter(r => r.session_id === s.id).map(r => [r.student_id,r.attendance_status])));}}><span><b>{batches.find(b => b.id === s.batch_id)?.name ?? "Batch"} · {subjects.find(v => v.id === s.subject_id)?.name ?? "Subject"}</b><small>{s.session_date} · {s.status}</small></span><em>{selectedAttendanceSession === s.id ? "Selected" : "Open register"}</em></button>)}{!attendanceSessions.length && <p className="education-empty">No attendance sessions yet.</p>}</div>
        {selectedAttendanceSession && (() => { const session = attendanceSessions.find(s => s.id === selectedAttendanceSession); const roster = students.filter(student => student.batch_id === session?.batch_id); return <div className="education-card education-wide-list"><h3>Class register <span>{roster.length} students</span></h3>{roster.map(student => <label className="attendance-row" key={student.id}><span><b>{student.full_name}</b><small>{student.admission_number}</small></span><select value={attendanceMarks[student.id] ?? "present"} onChange={e => setAttendanceMarks(current => ({...current,[student.id]:e.target.value}))}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></label>)}{!roster.length && <p className="education-empty">No students are assigned to this batch.</p>}<button className="primary" disabled={busy || !roster.length} onClick={() => void saveAttendance()}><CalendarCheck size={15}/> Save attendance</button></div>; })()}
      </div>}

      {(["Admissions","Guardians","Documents","Examinations","Reports"] as Tab[]).includes(tab) && <EducationOperations organizationId={organizationId} tab={tab as "Admissions" | "Guardians" | "Documents" | "Examinations" | "Reports"} readOnly={memberRole === "hod"} />}
      <footer className="education-footer"><span>{institution?.legal_name ?? "Institution profile not configured"}</span><span>Records loaded from the active organization only</span></footer>
    </section>
  );
}
