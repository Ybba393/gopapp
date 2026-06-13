export type Role = 'student' | 'admin';

export interface Cohort {
  id: string;
  name: string;
  year: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  cohort_id: string | null;
  default_password_changed: boolean;
  created_at: string;
  cohort?: Cohort;
}

export interface CapstoneGroup {
  id: string;
  name: string;
  cohort_id: string;
  created_at: string;
  members?: Profile[];
}

export interface GroupMember {
  id: string;
  student_id: string;
  group_id: string;
  created_at: string;
  profile?: Profile;
  group?: CapstoneGroup;
}

export interface VolunteerLog {
  id: string;
  student_id: string;
  project_name: string;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface ProgramDay {
  id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  date: string;
  has_exit_ticket: boolean;
  sort_order: number;
  checkin_opens_at: string | null;
  exit_ticket_opens_at: string | null;
  created_at: string;
  attendance?: Attendance[];
}

export interface Attendance {
  id: string;
  student_id: string;
  program_day_id: string;
  status: 'present' | 'absent';
  checked_in_at: string;
}

export interface ExitTicketResponse {
  id: string;
  student_id: string;
  program_day_id: string;
  responses: RaceCultureExitTicket;
  submitted_at: string;
}

// Race & Culture Day exit ticket shape
export interface RaceCultureExitTicket {
  breakfast_rating: number;    // 1–5
  lunch_rating: number;        // 1–5
  overall_rating: number;      // 1–5
  enjoyed_aspects: string[];
  better_understanding: 'yes' | 'somewhat' | 'not_yet';
  major_takeaways: string;
  additional_comments: string;
  critical_issues: string[];   // up to 5
}
