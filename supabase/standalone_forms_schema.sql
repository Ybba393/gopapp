-- ============================================================
-- STANDALONE FORMS
-- Forms that are NOT tied to a program day (surveys, RSVPs, etc.)
-- Run this entire file in Supabase SQL Editor.
-- ============================================================

-- 1. Table for form definitions (questions editable by Mrs. Sykes)
CREATE TABLE IF NOT EXISTS public.standalone_forms (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text        NOT NULL,
  description text,
  questions   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standalone_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read active forms" ON public.standalone_forms;
CREATE POLICY "Anyone authenticated can read active forms"
  ON public.standalone_forms FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage forms" ON public.standalone_forms;
CREATE POLICY "Admins manage forms"
  ON public.standalone_forms FOR ALL
  USING (public.is_admin());

-- 2. Table for form responses
CREATE TABLE IF NOT EXISTS public.form_responses (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      uuid        REFERENCES public.standalone_forms(id) ON DELETE CASCADE,
  respondent_id uuid       REFERENCES public.profiles(id) ON DELETE SET NULL,
  responses    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students insert own form responses" ON public.form_responses;
CREATE POLICY "Students insert own form responses"
  ON public.form_responses FOR INSERT
  WITH CHECK (respondent_id = auth.uid());

DROP POLICY IF EXISTS "Students read own form responses" ON public.form_responses;
CREATE POLICY "Students read own form responses"
  ON public.form_responses FOR SELECT
  USING (respondent_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage form responses" ON public.form_responses;
CREATE POLICY "Admins manage form responses"
  ON public.form_responses FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 3. Seed the three standalone forms
-- ============================================================

-- Clear existing seeds (safe to re-run)
DELETE FROM public.standalone_forms
WHERE title IN (
  'Generation of Promise End of Year Survey',
  'Stay Connected with Generation of Promise'
);

-- ── FORM 1: End of Year Survey ───────────────────────────────
INSERT INTO public.standalone_forms (title, description, questions, sort_order)
VALUES (
  'Generation of Promise End of Year Survey',
  'Please take a few minutes to share your thoughts on this year''s Generation of Promise program. Your feedback helps us grow!',
  $q$[
  {
    "id": "q1",
    "type": "single",
    "text": "Overall, how would you rate your Generation of Promise experience this year?",
    "options": ["Excellent", "Very Good", "Good", "Fair", "Needs Improvement"],
    "required": true
  },
  {
    "id": "q2",
    "type": "single",
    "text": "How likely are you to recommend Generation of Promise to a friend or classmate?",
    "options": ["Very Likely", "Likely", "Unsure", "Unlikely", "Very Unlikely"],
    "required": true
  },
  {
    "id": "q3",
    "type": "text",
    "text": "Describe your Generation of Promise experience in one word.",
    "required": true
  },
  {
    "id": "q4",
    "type": "textarea",
    "text": "What is your biggest key takeaway from Generation of Promise this year?",
    "required": true
  },
  {
    "id": "q5",
    "type": "single",
    "text": "Break the Ice Day — How did you enjoy this program day?",
    "options": ["Loved it", "Liked it", "Neutral", "Didn't enjoy it"],
    "required": true
  },
  {
    "id": "q6",
    "type": "textarea",
    "text": "Break the Ice Day — What stood out to you most?",
    "required": true
  },
  {
    "id": "q7",
    "type": "textarea",
    "text": "Break the Ice Day — Was there anything that challenged your thinking? If so, what was it?",
    "required": false
  },
  {
    "id": "q8",
    "type": "single",
    "text": "Race & Culture Day — How did you enjoy this program day?",
    "options": ["Loved it", "Liked it", "Neutral", "Didn't enjoy it"],
    "required": true
  },
  {
    "id": "q9",
    "type": "textarea",
    "text": "Race & Culture Day — What stood out to you most?",
    "required": true
  },
  {
    "id": "q10",
    "type": "textarea",
    "text": "Race & Culture Day — Was there anything that challenged your thinking? If so, what was it?",
    "required": false
  },
  {
    "id": "q11",
    "type": "single",
    "text": "Critical Issues Day — How did you enjoy this program day?",
    "options": ["Loved it", "Liked it", "Neutral", "Didn't enjoy it"],
    "required": true
  },
  {
    "id": "q12",
    "type": "textarea",
    "text": "Critical Issues Day — What stood out to you most?",
    "required": true
  },
  {
    "id": "q13",
    "type": "textarea",
    "text": "Critical Issues Day — Was there anything that challenged your thinking? If so, what was it?",
    "required": false
  },
  {
    "id": "q14",
    "type": "single",
    "text": "Detroit Focus Day — How did you enjoy this program day?",
    "options": ["Loved it", "Liked it", "Neutral", "Didn't enjoy it"],
    "required": true
  },
  {
    "id": "q15",
    "type": "textarea",
    "text": "Detroit Focus Day — What stood out to you most?",
    "required": true
  },
  {
    "id": "q16",
    "type": "textarea",
    "text": "Detroit Focus Day — Was there anything that challenged your thinking? If so, what was it?",
    "required": false
  },
  {
    "id": "q17",
    "type": "single",
    "text": "Volunteer & Advocacy Day — How did you enjoy this program day?",
    "options": ["Loved it", "Liked it", "Neutral", "Didn't enjoy it"],
    "required": true
  },
  {
    "id": "q18",
    "type": "textarea",
    "text": "Volunteer & Advocacy Day — What stood out to you most?",
    "required": true
  },
  {
    "id": "q19",
    "type": "textarea",
    "text": "Volunteer & Advocacy Day — Was there anything that challenged your thinking? If so, what was it?",
    "required": false
  },
  {
    "id": "q20",
    "type": "multi",
    "text": "Which program day(s) did you enjoy the most? (Select all that apply)",
    "options": ["Break the Ice Day", "Race & Culture Day", "Critical Issues Day", "Detroit Focus Day", "Volunteer & Advocacy Day"],
    "required": true
  },
  {
    "id": "q21",
    "type": "multi",
    "text": "What contributed most to your learning environment this year? (Select all that apply)",
    "options": ["My peers", "Mrs. Sykes", "Guest speakers/presenters", "Activities and workshops", "Capstone project work", "The program structure", "My school liaison"],
    "required": true
  },
  {
    "id": "q22",
    "type": "textarea",
    "text": "What topic, activity, or conversation left you most energized or inspired this year?",
    "required": true
  },
  {
    "id": "q23",
    "type": "single",
    "text": "Safety & Belonging — I felt safe being myself in this program. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q24",
    "type": "single",
    "text": "Safety & Belonging — I felt comfortable sharing my thoughts and opinions. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q25",
    "type": "single",
    "text": "Safety & Belonging — I felt supported by Mrs. Sykes and the program team. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q26",
    "type": "single",
    "text": "Safety & Belonging — I felt a sense of community and belonging with my peers. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q27",
    "type": "single",
    "text": "Safety & Belonging — The program content felt relevant to my life and experiences. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q28",
    "type": "single",
    "text": "Safety & Belonging — I felt respected and valued as a participant. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q29",
    "type": "textarea",
    "text": "If there were ever moments where you did NOT feel safe or supported, please share what happened. (Optional)",
    "required": false
  },
  {
    "id": "q30",
    "type": "textarea",
    "text": "What could we do to make the program environment even more welcoming or inclusive?",
    "required": true
  },
  {
    "id": "q31",
    "type": "multi",
    "text": "Personal Growth — In which of the following areas do you feel you have grown this year? (Select all that apply)",
    "options": [
      "Self-awareness",
      "Communication skills",
      "Critical thinking",
      "Leadership",
      "Empathy and perspective-taking",
      "Community engagement",
      "Confidence",
      "Goal-setting",
      "Understanding of social issues",
      "Capstone/project skills"
    ],
    "required": true
  },
  {
    "id": "q32",
    "type": "textarea",
    "text": "Personal Growth — Describe one specific way you have grown or changed because of Generation of Promise.",
    "required": true
  },
  {
    "id": "q33",
    "type": "single",
    "text": "Personal Growth — Generation of Promise has influenced how I think about my future. (1 = Strongly Disagree, 5 = Strongly Agree)",
    "options": ["1 – Strongly Disagree", "2 – Disagree", "3 – Neutral", "4 – Agree", "5 – Strongly Agree"],
    "required": true
  },
  {
    "id": "q34",
    "type": "textarea",
    "text": "Personal Growth — If yes, how has it influenced your thinking about your future? (Optional)",
    "required": false
  },
  {
    "id": "q35",
    "type": "single",
    "text": "Capstone Project — How meaningful was your capstone project experience?",
    "options": ["Very Meaningful", "Meaningful", "Somewhat Meaningful", "Not Meaningful"],
    "required": true
  },
  {
    "id": "q36",
    "type": "textarea",
    "text": "Capstone Project — What did you learn from working on your capstone project?",
    "required": true
  },
  {
    "id": "q37",
    "type": "textarea",
    "text": "Capstone Project — What additional support or resources would have helped you with your capstone?",
    "required": false
  },
  {
    "id": "q38",
    "type": "textarea",
    "text": "Program Feedback — What should we KEEP doing next year?",
    "required": true
  },
  {
    "id": "q39",
    "type": "textarea",
    "text": "Program Feedback — What should we STOP doing or change?",
    "required": true
  },
  {
    "id": "q40",
    "type": "textarea",
    "text": "Program Feedback — What should we START doing that we have not done yet?",
    "required": true
  },
  {
    "id": "q41",
    "type": "single",
    "text": "Program Feedback — How did you feel about the length of the program this year?",
    "options": ["Too long", "Just right", "Too short"],
    "required": true
  },
  {
    "id": "q42",
    "type": "textarea",
    "text": "Program Feedback — Do you have any feedback about food, transportation, or logistics? (Optional)",
    "required": false
  },
  {
    "id": "q43",
    "type": "textarea",
    "text": "Testimonial — Would you like to share a quote or testimonial about your experience? (Optional)",
    "required": false
  },
  {
    "id": "q44",
    "type": "single",
    "text": "Testimonial — May we share your quote in our program materials?",
    "options": ["Yes, with my full name", "Yes, first name only", "No, please keep it private"],
    "required": true
  },
  {
    "id": "q45",
    "type": "text",
    "text": "Testimonial — If yes, what name should we use? (Optional)",
    "required": false
  },
  {
    "id": "q46",
    "type": "single",
    "text": "Alumni Engagement — Are you interested in staying involved with Generation of Promise as an alumnus/alumna?",
    "options": ["Yes", "Maybe", "No"],
    "required": true
  },
  {
    "id": "q47",
    "type": "text",
    "text": "Alumni Engagement — What email address should we use to contact you about alumni opportunities?",
    "required": true
  },
  {
    "id": "q48",
    "type": "multi",
    "text": "Alumni Engagement — What types of alumni opportunities interest you? (Select all that apply)",
    "options": [
      "Mentoring future students",
      "Speaking at program days",
      "Volunteering at events",
      "Joining the Board of Allies",
      "Social media ambassador",
      "Networking and professional development"
    ],
    "required": false
  },
  {
    "id": "q49",
    "type": "textarea",
    "text": "Is there anything else you would like to share? Any final thoughts, shout-outs, or feedback? (Optional)",
    "required": false
  }
]$q$::jsonb,
  1
);

-- ── FORM 2: Stay Connected ───────────────────────────────────
INSERT INTO public.standalone_forms (title, description, questions, sort_order)
VALUES (
  'Stay Connected with Generation of Promise',
  'Thank you for being part of Generation of Promise! Let us know how you would like to stay connected.',
  $q$[
  {
    "id": "q1",
    "type": "text",
    "text": "Your full name",
    "required": true
  },
  {
    "id": "q2",
    "type": "text",
    "text": "Your email address",
    "required": true
  },
  {
    "id": "q3",
    "type": "single",
    "text": "What is your affiliation with Generation of Promise?",
    "options": ["Student / Alum", "Parent / Guardian", "Liaison", "Champion", "Friend of Student / Alum"],
    "required": true
  },
  {
    "id": "q4",
    "type": "single",
    "text": "Did you enjoy today's Graduation Celebration?",
    "options": ["Yes", "No", "Unsure"],
    "required": true
  },
  {
    "id": "q5",
    "type": "multi",
    "text": "What ways are you interested in staying connected? (Select all that apply)",
    "options": [
      "Alumni Engagement",
      "Volunteer",
      "New School Inquiry",
      "Generation of Promise Board of Allies",
      "Program Partner / Presenter",
      "Funder / Sponsor"
    ],
    "required": true
  },
  {
    "id": "q6",
    "type": "textarea",
    "text": "Any additional information you would like to share?",
    "required": false
  }
]$q$::jsonb,
  2
);
