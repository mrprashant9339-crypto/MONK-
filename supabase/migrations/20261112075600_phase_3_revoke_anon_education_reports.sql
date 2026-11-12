-- Summary views expose education reporting only to authenticated users; their security_invoker setting preserves underlying RLS.
revoke all on public.education_attendance_summary, public.education_results_summary from public, anon;
grant select on public.education_attendance_summary, public.education_results_summary to authenticated;
