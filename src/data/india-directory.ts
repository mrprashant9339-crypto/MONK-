/**
 * MONK India-wide institution discovery taxonomy.
 *
 * These are controlled vocabularies, not an imported institution dataset.
 * Never infer regulator approval or institution verification from taxonomy membership.
 */

export const INDIA_STATES_AND_UTS = [
  { code: "AN", name: "Andaman and Nicobar Islands", kind: "union_territory" },
  { code: "AP", name: "Andhra Pradesh", kind: "state" },
  { code: "AR", name: "Arunachal Pradesh", kind: "state" },
  { code: "AS", name: "Assam", kind: "state" },
  { code: "BR", name: "Bihar", kind: "state" },
  { code: "CH", name: "Chandigarh", kind: "union_territory" },
  { code: "CT", name: "Chhattisgarh", kind: "state" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "union_territory" },
  { code: "DL", name: "Delhi", kind: "union_territory" },
  { code: "GA", name: "Goa", kind: "state" },
  { code: "GJ", name: "Gujarat", kind: "state" },
  { code: "HR", name: "Haryana", kind: "state" },
  { code: "HP", name: "Himachal Pradesh", kind: "state" },
  { code: "JK", name: "Jammu and Kashmir", kind: "union_territory" },
  { code: "JH", name: "Jharkhand", kind: "state" },
  { code: "KA", name: "Karnataka", kind: "state" },
  { code: "KL", name: "Kerala", kind: "state" },
  { code: "LA", name: "Ladakh", kind: "union_territory" },
  { code: "LD", name: "Lakshadweep", kind: "union_territory" },
  { code: "MP", name: "Madhya Pradesh", kind: "state" },
  { code: "MH", name: "Maharashtra", kind: "state" },
  { code: "MN", name: "Manipur", kind: "state" },
  { code: "ML", name: "Meghalaya", kind: "state" },
  { code: "MZ", name: "Mizoram", kind: "state" },
  { code: "NL", name: "Nagaland", kind: "state" },
  { code: "OD", name: "Odisha", kind: "state" },
  { code: "PY", name: "Puducherry", kind: "union_territory" },
  { code: "PB", name: "Punjab", kind: "state" },
  { code: "RJ", name: "Rajasthan", kind: "state" },
  { code: "SK", name: "Sikkim", kind: "state" },
  { code: "TN", name: "Tamil Nadu", kind: "state" },
  { code: "TS", name: "Telangana", kind: "state" },
  { code: "TR", name: "Tripura", kind: "state" },
  { code: "UP", name: "Uttar Pradesh", kind: "state" },
  { code: "UK", name: "Uttarakhand", kind: "state" },
  { code: "WB", name: "West Bengal", kind: "state" },
] as const;

export const INSTITUTION_CATEGORIES = [
  { id: "university", label: "Universities", domains: ["multidisciplinary"] },
  { id: "engineering", label: "Engineering & Technology", domains: ["engineering", "technology"] },
  { id: "medical", label: "Medical Colleges", domains: ["medical"] },
  { id: "dental", label: "Dental Colleges", domains: ["dental"] },
  { id: "ayush", label: "AYUSH Institutions", domains: ["ayurveda", "siddha", "unani", "sowa_rigpa", "homoeopathy"] },
  { id: "allied_health", label: "Allied & Healthcare Professions", domains: ["allied_health", "physiotherapy", "occupational_therapy", "optometry"] },
  { id: "nursing", label: "Nursing Colleges", domains: ["nursing"] },
  { id: "pharmacy", label: "Pharmacy Colleges", domains: ["pharmacy"] },
  { id: "law", label: "Law Colleges", domains: ["law"] },
  { id: "commerce", label: "Commerce Colleges", domains: ["commerce"] },
  { id: "management", label: "Management Institutes", domains: ["management"] },
  { id: "arts_science", label: "Arts & Science Colleges", domains: ["arts", "science"] },
  { id: "education", label: "Teacher Education", domains: ["education"] },
  { id: "agriculture", label: "Agriculture Colleges", domains: ["agriculture"] },
  { id: "veterinary", label: "Veterinary Colleges", domains: ["veterinary"] },
  { id: "rehabilitation", label: "Rehabilitation & Special Education", domains: ["rehabilitation"] },
  { id: "architecture", label: "Architecture & Planning", domains: ["architecture", "planning"] },
  { id: "design", label: "Design & Creative Arts", domains: ["design", "creative_arts"] },
  { id: "polytechnic", label: "Polytechnic", domains: ["technical_diploma"] },
  { id: "iti", label: "ITI & Industrial Training", domains: ["vocational"] },
  { id: "research", label: "Research Institutes", domains: ["research"] },
  { id: "coaching", label: "Coaching & Test Preparation", domains: ["coaching"] },
  { id: "vocational", label: "Vocational & Skill Training", domains: ["vocational", "skills"] },
  { id: "other", label: "Other Institutions", domains: ["other"] },
] as const;

export const INSTITUTION_OWNERSHIP = [
  { id: "central_government", label: "Central Government" },
  { id: "state_government", label: "State Government" },
  { id: "local_body", label: "Local Government Body" },
  { id: "government_aided", label: "Government Aided" },
  { id: "private", label: "Private" },
  { id: "deemed", label: "Deemed to be University" },
  { id: "autonomous", label: "Autonomous" },
  { id: "trust_society", label: "Trust / Society" },
  { id: "other", label: "Other" },
] as const;

export const INSTITUTION_KINDS = [
  { id: "university", label: "University" },
  { id: "college", label: "College" },
  { id: "standalone_institute", label: "Standalone Institute" },
  { id: "academy", label: "Academy" },
  { id: "coaching_centre", label: "Coaching Centre" },
  { id: "vocational_centre", label: "Vocational / Training Centre" },
  { id: "research_centre", label: "Research Centre" },
] as const;

export const VERIFICATION_STATES = [
  "verified",
  "partially_verified",
  "unverified",
  "stale",
  "disputed",
  "closed",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const REGULATORY_SOURCES = [
  { id: "aishe", name: "AISHE / Ministry of Education", domains: ["higher_education"], url: "https://dashboard.aishe.gov.in/" },
  { id: "ugc", name: "University Grants Commission", domains: ["universities", "degree_awarding_authority"], url: "https://www.ugc.gov.in/universitydetails/" },
  { id: "aicte", name: "All India Council for Technical Education", domains: ["technical_education", "engineering", "management", "pharmacy_where_applicable"], url: "https://www.aicte-india.org/" },
  { id: "nmc", name: "National Medical Commission", domains: ["medical"], url: "https://www.nmc.org.in/information-desk/college-and-course-search/" },
  { id: "dci", name: "Dental Council of India", domains: ["dental"], url: "https://dciindia.gov.in/" },
  { id: "bci", name: "Bar Council of India", domains: ["law"], url: "https://www.barcouncilofindia.org/" },
  { id: "pci", name: "Pharmacy Council of India", domains: ["pharmacy"], url: "https://www.pci.nic.in/" },
  { id: "inc", name: "Indian Nursing Council", domains: ["nursing"], url: "https://www.indiannursingcouncil.org/" },
  { id: "ncte", name: "National Council for Teacher Education", domains: ["teacher_education"], url: "https://web.ncte.gov.in/page/recognized-institutions" },
  { id: "coa", name: "Council of Architecture", domains: ["architecture"], url: "https://www.coa.gov.in/" },
  { id: "icar", name: "Indian Council of Agricultural Research", domains: ["agriculture"], url: "https://icar.org.in/" },
  { id: "ncism", name: "National Commission for Indian System of Medicine", domains: ["ayurveda", "siddha", "unani", "sowa_rigpa"], url: "https://ncism.org.in/" },
  { id: "nch", name: "National Commission for Homoeopathy", domains: ["homoeopathy"], url: "https://nch.org.in/mqrl" },
  { id: "vci", name: "Veterinary Council of India", domains: ["veterinary"], url: "https://vci.admissions.nic.in/institutes/" },
  { id: "rci", name: "Rehabilitation Council of India", domains: ["rehabilitation", "special_education"], url: "https://rehabcouncil.nic.in/regular-mode-inst/" },
  { id: "ncahp", name: "National Commission for Allied and Healthcare Professions", domains: ["allied_health"], url: "https://www.mohfw.gov.in/sites/default/files/Public%20notice%20by%20NCAHP-signed.pdf" },
  { id: "ncvet", name: "National Council for Vocational Education and Training", domains: ["vocational", "skills"], url: "https://ncvet.gov.in/" },
  { id: "ncvt", name: "NCVT / DGT", domains: ["iti", "vocational"], url: "https://www.ncvtmis.gov.in/" },
  { id: "state_dte", name: "State DTE / Technical Education Boards", domains: ["polytechnic", "state_affiliation"], url: "https://www.education.gov.in/" },
] as const;

export const POLICY_ORGANIZATION_TYPES = [
  { id: "government_college", label: "Government College", policyKeys: ["platform", "privacy", "education", "government_entity", "student_data"] },
  { id: "government_university", label: "Government University", policyKeys: ["platform", "privacy", "education", "government_entity", "student_data", "research_data"] },
  { id: "private_college", label: "Private College", policyKeys: ["platform", "privacy", "education", "private_entity", "student_data", "data_processing"] },
  { id: "private_university", label: "Private University", policyKeys: ["platform", "privacy", "education", "private_entity", "student_data", "data_processing", "research_data"] },
  { id: "coaching_institute", label: "Coaching Institute", policyKeys: ["platform", "privacy", "coaching_services", "consumer_terms", "student_data"] },
  { id: "business", label: "Business", policyKeys: ["platform", "privacy", "business_services", "payments", "customer_data"] },
  { id: "government_body", label: "Government Body", policyKeys: ["platform", "privacy", "government_entity", "data_processing"] },
  { id: "trust_society", label: "Trust / Society", policyKeys: ["platform", "privacy", "private_entity", "data_processing"] },
  { id: "sole_proprietor", label: "Sole Proprietor", policyKeys: ["platform", "privacy", "business_services", "payments", "customer_data"] },
  { id: "company", label: "Company", policyKeys: ["platform", "privacy", "business_services", "payments", "customer_data", "data_processing"] },
  { id: "partnership", label: "Partnership", policyKeys: ["platform", "privacy", "business_services", "payments", "customer_data"] },
  { id: "other", label: "Other Organization", policyKeys: ["platform", "privacy"] },
] as const;

export const INDIA_DIRECTORY_DEFAULTS = {
  countryCode: "IN",
  defaultPageSize: 24,
  maxPageSize: 100,
  defaultSort: "relevance",
  supportedLocationLevels: ["state", "district", "city", "locality"] as const,
} as const;
