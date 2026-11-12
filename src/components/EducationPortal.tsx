import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BookOpen, CalendarCheck, ClipboardList, FileText, GraduationCap, RefreshCw, Users } from "lucide-react";

type Role = "teacher"|"student"|"parent";
type Student = { id:string; full_name:string; admission_number:string; batch_id:string|null; program_id?:string|null; department_id?:string|null; status:string; email:string|null };
type Faculty = { id:string; full_name:string; employee_number:string; department_id:string|null };
type Timetable = { id:string; batch_id:string; subject_id:string; faculty_id:string; weekday:number; starts_at:string; ends_at:string; room:string|null };
type Session = { id:string; batch_id:string; subject_id:string; faculty_id:string; session_date:string; starts_at:string|null; ends_at:string|null; status:string };
type Attendance = { id:string; session_id:string; student_id:string; attendance_status:string };
type Result = { id:string; student_id:string; marks_obtained:number|null; grade:string|null; status:string; exam_subject_id:string };
type Subject = { id:string; name:string; code:string };
type Application = { id:string; application_number:string; full_name:string; status:string; submitted_at:string };
type Guardian = { id:string; full_name:string; email:string };
type Exam = { id:string; title:string; batch_id:string|null; program_id:string; status:string };
type ExamSubject = { id:string; exam_id:string; subject_id:string; max_marks:number; pass_marks:number };
type Props = { organizationId:string; role:Role };
type PortalDocument = { id:string; file_name:string; category:string; status:string; storage_path:string; student_id:string|null };
type ParentResult = { id:string; student_id:string; marks_obtained:number|null; grade:string|null; status:string };

export default function EducationPortal({organizationId,role}:Props) {
 const [userId,setUserId]=useState(""),[email,setEmail]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [student,setStudent]=useState<Student|null>(null),[faculty,setFaculty]=useState<Faculty|null>(null),[guardian,setGuardian]=useState<Guardian|null>(null),[children,setChildren]=useState<Student[]>([]);
 const [timetable,setTimetable]=useState<Timetable[]>([]),[sessions,setSessions]=useState<Session[]>([]),[attendance,setAttendance]=useState<Attendance[]>([]),[results,setResults]=useState<Result[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[applications,setApplications]=useState<Application[]>([]);
 const [selectedSession,setSelectedSession]=useState(""),[marks,setMarks]=useState<Record<string,string>>({});
 const [applicationName,setApplicationName]=useState(""),[applicationPhone,setApplicationPhone]=useState(""),[applicationGuardian,setApplicationGuardian]=useState(""),[applicationGuardianPhone,setApplicationGuardianPhone]=useState(""),[applicationProgram,setApplicationProgram]=useState("");
 const [programs,setPrograms]=useState<Array<{id:string;name:string}>>([]),[documentCategory,setDocumentCategory]=useState("identity"),[documentFile,setDocumentFile]=useState<File|null>(null);
 const [documents,setDocuments]=useState<PortalDocument[]>([]),[parentResults,setParentResults]=useState<ParentResult[]>([]),[parentAttendance,setParentAttendance]=useState<Attendance[]>([]),[teacherRoster,setTeacherRoster]=useState<Student[]>([]);
 const [teacherExams,setTeacherExams]=useState<Exam[]>([]),[teacherExamSubjects,setTeacherExamSubjects]=useState<ExamSubject[]>([]),[teacherResultSubject,setTeacherResultSubject]=useState(""),[teacherResultRoster,setTeacherResultRoster]=useState<Student[]>([]),[teacherResultMarks,setTeacherResultMarks]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!supabase)return;setBusy(true);setError("");
  try{
   const auth=await supabase.auth.getUser();if(auth.error)throw auth.error;if(!auth.data.user)throw new Error("Sign in to access your education portal.");
   setUserId(auth.data.user.id);setEmail(auth.data.user.email??"");
   if(role==="student"){
    const {error:claimError}=await supabase.from("education_students").update({user_id:auth.data.user.id})
      .eq("organization_id",organizationId).eq("email",auth.data.user.email??"").is("user_id",null);
    if(claimError)throw claimError;
    const {data:s,error:e}=await supabase.from("education_students").select("id,full_name,admission_number,batch_id,status,email").eq("organization_id",organizationId).eq("user_id",auth.data.user.id).maybeSingle();if(e)throw e;setStudent(s as Student|null);
    const [t,a,r,apps,p,sub,docs]=await Promise.all([
     supabase.from("education_timetable_entries").select("id,batch_id,subject_id,faculty_id,weekday,starts_at,ends_at,room").eq("organization_id",organizationId),
     supabase.from("education_attendance_records").select("id,session_id,student_id,attendance_status").eq("organization_id",organizationId).eq("student_id",s?.id??"00000000-0000-0000-0000-000000000000"),
     supabase.from("education_results").select("id,student_id,marks_obtained,grade,status,exam_subject_id").eq("organization_id",organizationId).eq("student_id",s?.id??"00000000-0000-0000-0000-000000000000").eq("status","published"),
     supabase.from("education_admission_applications").select("id,application_number,full_name,status,submitted_at").eq("organization_id",organizationId).eq("applicant_user_id",auth.data.user.id),
     supabase.from("education_programs").select("id,name").eq("organization_id",organizationId),
     supabase.from("education_subjects").select("id,name,code").eq("organization_id",organizationId),
     supabase.from("education_documents").select("id,file_name,category,status,storage_path,student_id").eq("organization_id",organizationId).eq("student_id",s?.id??"00000000-0000-0000-0000-000000000000")
    ]);for(const x of [t,a,r,apps,p,sub,docs])if(x.error)throw x.error;setTimetable((t.data??[]) as Timetable[]);setAttendance((a.data??[]) as Attendance[]);setResults((r.data??[]) as Result[]);setApplications((apps.data??[]) as Application[]);setPrograms(p.data??[]);setSubjects(sub.data??[]);setDocuments((docs.data??[]) as PortalDocument[]);
   }else if(role==="teacher"){
    const {error:claimError}=await supabase.rpc("education_claim_faculty_profile");if(claimError && claimError.code!=="P0002")throw claimError;
    const {data:f,error:e}=await supabase.from("education_faculty").select("id,full_name,employee_number,department_id").eq("organization_id",organizationId).maybeSingle();if(e)throw e;setFaculty(f as Faculty|null);
    const [t,s,sub,ex,es]=await Promise.all([
     supabase.from("education_timetable_entries").select("id,batch_id,subject_id,faculty_id,weekday,starts_at,ends_at,room").eq("organization_id",organizationId),
     supabase.from("education_attendance_sessions").select("id,batch_id,subject_id,faculty_id,session_date,starts_at,ends_at,status").eq("organization_id",organizationId).order("session_date",{ascending:false}).limit(100),
     supabase.from("education_subjects").select("id,name,code").eq("organization_id",organizationId),
     supabase.from("education_exams").select("id,title,batch_id,program_id,status").eq("organization_id",organizationId),
     supabase.from("education_exam_subjects").select("id,exam_id,subject_id,max_marks,pass_marks").eq("organization_id",organizationId)
    ]);for(const x of [t,s,sub,ex,es])if(x.error)throw x.error;setTimetable((t.data??[]) as Timetable[]);setSessions((s.data??[]) as Session[]);setSubjects((sub.data??[]) as Subject[]);setTeacherExams((ex.data??[]) as Exam[]);setTeacherExamSubjects((es.data??[]) as ExamSubject[]);
   }else{
    const {error:claimError}=await supabase.from("education_guardians").update({user_id:auth.data.user.id})
      .eq("organization_id",organizationId).eq("email",auth.data.user.email??"").is("user_id",null);
    if(claimError)throw claimError;
    const {data:g,error:e}=await supabase.from("education_guardians").select("id,full_name,email").eq("organization_id",organizationId).eq("user_id",auth.data.user.id).maybeSingle();if(e)throw e;setGuardian(g as Guardian|null);
    const {data:links,error:le}=await supabase.from("education_student_guardians").select("student_id").eq("organization_id",organizationId);if(le)throw le;
    const ids=(links??[]).map(x=>x.student_id);
    if(ids.length){const {data:child,error:ce}=await supabase.from("education_students").select("id,full_name,admission_number,batch_id,status,email").eq("organization_id",organizationId).in("id",ids);if(ce)throw ce;setChildren((child??[]) as Student[]);}
    else setChildren([]);
    if(ids.length){
     const [pr,pa,pd]=await Promise.all([
      supabase.from("education_results").select("id,student_id,marks_obtained,grade,status").eq("organization_id",organizationId).in("student_id",ids).eq("status","published"),
      supabase.from("education_attendance_records").select("id,session_id,student_id,attendance_status").eq("organization_id",organizationId).in("student_id",ids),
      supabase.from("education_documents").select("id,file_name,category,status,storage_path,student_id").eq("organization_id",organizationId).in("student_id",ids)
     ]);if(pr.error)throw pr.error;if(pa.error)throw pa.error;if(pd.error)throw pd.error;setParentResults((pr.data??[]) as ParentResult[]);setParentAttendance((pa.data??[]) as Attendance[]);setDocuments((pd.data??[]) as PortalDocument[]);
    }else{setParentResults([]);setParentAttendance([]);setDocuments([]);}
   }
  }catch(e){setError(e instanceof Error?e.message:"Portal data could not be loaded.");}finally{setBusy(false);}
 },[organizationId,role]);
 useEffect(()=>{void load();},[load]);

 async function openDocument(path:string){if(!supabase)return;const {data,error:e}=await supabase.storage.from("education-private").createSignedUrl(path,60);if(e){setError(e.message);return;}if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");}
 async function submitApplication(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError("");setNotice("");try{
  const {error:e}=await supabase.from("education_admission_applications").insert({organization_id:organizationId,applicant_user_id:userId,application_number:"APP-"+crypto.randomUUID().slice(0,8).toUpperCase(),full_name:applicationName.trim(),email:email.toLowerCase(),phone:applicationPhone.trim()||null,guardian_name:applicationGuardian.trim()||null,guardian_phone:applicationGuardianPhone.trim()||null,program_id:applicationProgram||null,status:"submitted"});
  if(e)throw e;setNotice("Admission application submitted.");setApplicationName("");setApplicationPhone("");setApplicationGuardian("");setApplicationGuardianPhone("");await load();
 }catch(e){setError(e instanceof Error?e.message:"Application could not be submitted.");}finally{setBusy(false);}}
 async function uploadDocument(e:FormEvent){e.preventDefault();if(!supabase||!documentFile)return;setBusy(true);setError("");try{
  if(documentFile.size>10*1024*1024)throw new Error("Maximum file size is 10 MB.");
  if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(documentFile.type))throw new Error("Only PDF, JPG, PNG and WebP files are accepted.");
  const entity=student?.id??applications[0]?.id;if(!entity)throw new Error("Submit an admission application or wait for your student profile before uploading.");
  const folder=student?"students":"applications";const path=organizationId+"/"+folder+"/"+entity+"/"+crypto.randomUUID()+"-"+documentFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const {error:up}=await supabase.storage.from("education-private").upload(path,documentFile,{contentType:documentFile.type,upsert:false});if(up)throw up;
  const {error:row}=await supabase.from("education_documents").insert({organization_id:organizationId,student_id:student?.id??null,application_id:student?null:entity,category:documentCategory,file_name:documentFile.name,storage_path:path,mime_type:documentFile.type,file_size:documentFile.size,status:"pending",submitted_by:userId});
  if(row){await supabase.storage.from("education-private").remove([path]);throw row;}setDocumentFile(null);setNotice("Document uploaded for verification.");
 }catch(e){setError(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}
 async function selectSession(id:string){setSelectedSession(id);if(!supabase)return;const session=sessions.find(x=>x.id===id);if(!session)return;const [records,roster]=await Promise.all([supabase.from("education_attendance_records").select("id,session_id,student_id,attendance_status").eq("organization_id",organizationId).eq("session_id",id),supabase.from("education_students").select("id,full_name,admission_number,batch_id,status,email").eq("organization_id",organizationId).eq("batch_id",session.batch_id)]);if(records.error){setError(records.error.message);return;}if(roster.error){setError(roster.error.message);return;}setTeacherRoster((roster.data??[]) as Student[]);setAttendance((records.data??[]) as Attendance[]);setMarks(Object.fromEntries((records.data??[]).map(x=>[x.student_id,x.attendance_status])));}
 async function saveAttendance(){if(!supabase||!selectedSession)return;setBusy(true);setError("");try{
  const session=sessions.find(x=>x.id===selectedSession);if(!session)throw new Error("Select a valid attendance session.");
  if(!teacherRoster.length)throw new Error("No students are assigned to this batch.");
  const rows=teacherRoster.map(s=>({organization_id:organizationId,session_id:session.id,student_id:s.id,attendance_status:marks[s.id]??"present",marked_by:userId}));
  const {error:save}=await supabase.from("education_attendance_records").upsert(rows,{onConflict:"organization_id,session_id,student_id"});if(save)throw save;
  setNotice("Attendance saved.");await load();
 }catch(e){setError(e instanceof Error?e.message:"Attendance could not be saved.");}finally{setBusy(false);}}
 async function selectTeacherExamSubject(id:string){
  setTeacherResultSubject(id);if(!supabase)return;
  const item=teacherExamSubjects.find(x=>x.id===id);const exam=teacherExams.find(x=>x.id===item?.exam_id);
  if(!item||!exam){setTeacherResultRoster([]);return;}
  const assignedBatchIds=exam.batch_id?[exam.batch_id]:Array.from(new Set(timetable.filter(t=>t.subject_id===item.subject_id).map(t=>t.batch_id)));
  if(!assignedBatchIds.length){setTeacherResultRoster([]);setError("No assigned class batches were found for this subject.");return;}
  const {data,error:e}=await supabase.from("education_students").select("id,full_name,admission_number,batch_id,status,email").eq("organization_id",organizationId).in("batch_id",assignedBatchIds);
  if(e){setError(e.message);return;}setTeacherResultRoster((data??[]) as Student[]);
 }
 async function saveTeacherResults(){
  if(!supabase||!teacherResultSubject)return;setBusy(true);setError("");
  try{
   const item=teacherExamSubjects.find(x=>x.id===teacherResultSubject);if(!item||!teacherResultRoster.length)throw new Error("Select an assigned exam subject and batch roster.");
   const invalidMark=teacherResultRoster.find(s=>teacherResultMarks[s.id]!==undefined&&teacherResultMarks[s.id]!==""&&(!Number.isFinite(Number(teacherResultMarks[s.id]))||Number(teacherResultMarks[s.id])<0||Number(teacherResultMarks[s.id])>item.max_marks));
   if(invalidMark)throw new Error("Marks for "+invalidMark.full_name+" must be between 0 and "+item.max_marks+".");
   const user=await supabase.auth.getUser();const rows=teacherResultRoster.filter(s=>teacherResultMarks[s.id]!==undefined&&teacherResultMarks[s.id]!=="").map(s=>({organization_id:organizationId,exam_subject_id:item.id,student_id:s.id,marks_obtained:Number(teacherResultMarks[s.id]),status:"draft",entered_by:user.data.user?.id??null}));
   if(!rows.length)throw new Error("Enter marks for at least one student.");
   const {error:e}=await supabase.from("education_results").upsert(rows,{onConflict:"organization_id,exam_subject_id,student_id"});if(e)throw e;setNotice("Draft marks saved. Institution leadership must publish the exam results.");
  }catch(e){setError(e instanceof Error?e.message:"Marks could not be saved.");}finally{setBusy(false);}
 }
 const subjectName=(id:string)=>subjects.find(s=>s.id===id)?.name??"Subject";
 return <section className="education-page">
  <header className="education-heading"><div><p className="eyebrow">MONK EDUCATION PORTAL</p><h2>{role==="teacher"?"Teacher workspace":role==="student"?"Student dashboard":"Parent portal"}</h2><p className="muted">Authenticated access for {email}. Data is restricted by your education role.</p></div><button className="education-refresh" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Refresh</button></header>
  {error&&<div className="education-alert error" role="alert">{error}</div>}{notice&&<div className="education-alert" role="status">{notice}</div>}{busy&&<div className="education-loading"><RefreshCw size={13}/> Syncing portal…</div>}
  {role==="student"&&<><div className="education-metrics"><article><GraduationCap size={17}/><strong>{student?"Active":"—"}</strong><span>Student profile</span></article><article><CalendarCheck size={17}/><strong>{attendance.length}</strong><span>Attendance entries</span></article><article><BookOpen size={17}/><strong>{results.length}</strong><span>Published results</span></article><article><FileText size={17}/><strong>{applications.length}</strong><span>Admission applications</span></article></div>
   {!student&&<div className="education-grid"><form className="education-card education-form" onSubmit={submitApplication}><div className="education-card-heading"><GraduationCap size={17}/><div><b>Apply for admission</b><small>Submit an application to this institution.</small></div></div><label>Full name<input required value={applicationName} onChange={e=>setApplicationName(e.target.value)}/></label><label>Phone<input value={applicationPhone} onChange={e=>setApplicationPhone(e.target.value)}/></label><label>Guardian name<input value={applicationGuardian} onChange={e=>setApplicationGuardian(e.target.value)}/></label><label>Guardian phone<input value={applicationGuardianPhone} onChange={e=>setApplicationGuardianPhone(e.target.value)}/></label><label>Programme<select value={applicationProgram} onChange={e=>setApplicationProgram(e.target.value)}><option value="">Select programme</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="primary" disabled={busy}><FileText size={14}/> Submit application</button></form><div className="education-card"><h3>Application status</h3>{applications.map(a=><div className="education-record" key={a.id}><FileText size={15}/><div><b>{a.application_number}</b><small>{a.status} · {new Date(a.submitted_at).toLocaleDateString()}</small></div></div>)}</div></div>}
   {student&&<><div className="education-card"><h3>{student.full_name} <span>{student.admission_number}</span></h3><p>Status: {student.status}</p></div><div className="education-grid"><div className="education-card"><h3>My timetable</h3>{timetable.map(t=><div className="education-record" key={t.id}><CalendarCheck size={15}/><div><b>{subjectName(t.subject_id)}</b><small>Weekday {t.weekday} · {t.starts_at.slice(0,5)}–{t.ends_at.slice(0,5)} {t.room??""}</small></div></div>)}{!timetable.length&&<p className="education-empty">No timetable published.</p>}</div><div className="education-card"><h3>Published results</h3>{results.map(r=><div className="education-record" key={r.id}><BookOpen size={15}/><div><b>{r.marks_obtained??"—"} marks</b><small>{r.grade??"Grade pending"}</small></div></div>)}{!results.length&&<p className="education-empty">No published results yet.</p>}</div></div><div className="education-card"><h3>Attendance history <span>{attendance.length} records</span></h3>{attendance.map(a=><div className="education-record" key={a.id}><CalendarCheck size={15}/><div><b>{a.attendance_status}</b><small>Session {a.session_id.slice(0,8)}</small></div></div>)}</div><form className="education-card education-form" onSubmit={uploadDocument}><div className="education-card-heading"><FileText size={17}/><div><b>Upload required document</b><small>Private institution storage · 10 MB max</small></div></div><label>Category<select value={documentCategory} onChange={e=>setDocumentCategory(e.target.value)}>{["identity","address","photo","marksheet","transfer_certificate","caste","income","other"].map(v=><option key={v}>{v}</option>)}</select></label><label>File<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e=>setDocumentFile(e.target.files?.[0]??null)}/></label><button className="primary" disabled={busy||!documentFile}>Upload document</button></form><div className="education-card"><h3>My documents</h3>{documents.map(d=><div className="education-record" key={d.id}><FileText size={15}/><div><b>{d.file_name}</b><small>{d.category} · {d.status}</small></div><button type="button" className="education-refresh" onClick={()=>void openDocument(d.storage_path)}>Open</button></div>)}</div></>}
  </>}
  {role==="teacher"&&<><div className="education-metrics"><article><Users size={17}/><strong>{faculty?"Linked":"Pending"}</strong><span>Faculty profile</span></article><article><CalendarCheck size={17}/><strong>{timetable.length}</strong><span>Assigned timetable slots</span></article><article><ClipboardList size={17}/><strong>{sessions.length}</strong><span>Attendance sessions</span></article></div>{faculty&&<div className="education-card"><h3>{faculty.full_name} <span>{faculty.employee_number}</span></h3><p>Teacher account successfully linked to faculty record.</p></div>}<div className="education-grid"><div className="education-card"><h3>My timetable</h3>{timetable.map(t=><div className="education-record" key={t.id}><CalendarCheck size={15}/><div><b>{subjectName(t.subject_id)}</b><small>Weekday {t.weekday} · {t.starts_at.slice(0,5)}–{t.ends_at.slice(0,5)} · Batch {t.batch_id.slice(0,8)}</small></div></div>)}{!timetable.length&&<p className="education-empty">No timetable assignments found.</p>}</div><div className="education-card"><h3>Attendance sessions</h3>{sessions.map(s=><button className={"education-session "+(selectedSession===s.id?"selected":"")} key={s.id} onClick={()=>void selectSession(s.id)}><span><b>{s.session_date} · {s.status}</b><small>Batch {s.batch_id.slice(0,8)}</small></span><em>Open register</em></button>)}{!sessions.length&&<p className="education-empty">No sessions assigned.</p>}</div></div>{selectedSession&&<div className="education-card"><h3>Mark attendance</h3><p>Student roster for selected session. Default status is Present.</p>{teacherRoster.map(s=><label className="attendance-row" key={s.id}><span><b>{s.full_name}</b><small>{s.admission_number}</small></span><select value={marks[s.id]??"present"} onChange={e=>setMarks(old=>({...old,[s.id]:e.target.value}))}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></label>)}<button className="primary" disabled={busy||!teacherRoster.length} onClick={()=>void saveAttendance()}>Save class attendance</button></div>}<div className="education-card education-form"><div className="education-card-heading"><BookOpen size={17}/><div><b>Enter examination marks</b><small>Only subjects assigned to your timetable are available.</small></div></div><label>Exam subject<select value={teacherResultSubject} onChange={e=>void selectTeacherExamSubject(e.target.value)}><option value="">Select assigned exam subject</option>{teacherExamSubjects.map(es=><option key={es.id} value={es.id}>{teacherExams.find(x=>x.id===es.exam_id)?.title??"Exam"} · {subjectName(es.subject_id)}</option>)}</select></label>{teacherResultRoster.map(s=><label className="attendance-row" key={s.id}><span><b>{s.full_name}</b><small>{s.admission_number}</small></span><input type="number" min="0" max={teacherExamSubjects.find(x=>x.id===teacherResultSubject)?.max_marks??100} step="0.5" value={teacherResultMarks[s.id]??""} onChange={e=>setTeacherResultMarks(old=>({...old,[s.id]:e.target.value}))}/></label>)}<button className="primary" disabled={busy||!teacherResultSubject||!teacherResultRoster.length} onClick={()=>void saveTeacherResults()}>Save draft marks</button></div></>}
  {role==="parent"&&<><div className="education-metrics"><article><Users size={17}/><strong>{guardian?"Linked":"Pending"}</strong><span>Guardian profile</span></article><article><GraduationCap size={17}/><strong>{children.length}</strong><span>Linked children</span></article></div>{guardian&&<div className="education-card"><h3>{guardian.full_name}</h3><p>Parent account verified for {guardian.email}.</p></div>}<div className="education-grid">{children.map(child=><div className="education-card" key={child.id}><div className="education-card-heading"><GraduationCap size={17}/><div><b>{child.full_name}</b><small>{child.admission_number} · {child.status}</small></div></div><p>{parentResults.filter(r=>r.student_id===child.id).length} published result entries · {parentAttendance.filter(a=>a.student_id===child.id).length} attendance records</p>{parentResults.filter(r=>r.student_id===child.id).map(r=><div className="education-record" key={r.id}><BookOpen size={14}/><div><b>{r.marks_obtained??"—"} marks</b><small>{r.grade??"Grade pending"}</small></div></div>)}{documents.filter(d=>d.student_id===child.id).map(d=><div className="education-record" key={d.id}><FileText size={14}/><div><b>{d.file_name}</b><small>{d.category} · {d.status}</small></div><button type="button" className="education-refresh" onClick={()=>void openDocument(d.storage_path)}>Open</button></div>)}</div>)}{!children.length&&<div className="education-card"><p className="education-empty">No linked student records yet. Contact the institution administrator to link your guardian account.</p></div>}</div></>}
 </section>;
}
