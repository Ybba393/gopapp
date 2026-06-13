-- Load Volunteer and Advocacy Day exit ticket questions
-- Run in Supabase SQL Editor.
-- Mrs. Sykes can edit these anytime from the Exit Tickets tab.

UPDATE public.program_days
SET questions = $q$[
  {
    "id": "q1",
    "type": "rating",
    "text": "How would you rate breakfast?",
    "required": true
  },
  {
    "id": "q2",
    "type": "rating",
    "text": "How would you rate the volunteer experience?",
    "required": true
  },
  {
    "id": "q3",
    "type": "rating",
    "text": "How would you rate lunch?",
    "required": true
  },
  {
    "id": "q4",
    "type": "rating",
    "text": "How would you rate the panel discussion with Focus: HOPE staff?",
    "required": true
  },
  {
    "id": "q5",
    "type": "rating",
    "text": "How would you rate the interactive learning lab?",
    "required": true
  },
  {
    "id": "q6",
    "type": "multi",
    "text": "During Session 4, what aspects did you enjoy most? (Check all that apply)",
    "options": ["Volunteer Experience", "Panel Discussion", "Interactive Learning Lab", "Capstone Time"],
    "required": false
  },
  {
    "id": "q7",
    "type": "single",
    "text": "Do you feel like you have a better understanding of how volunteerism and advocacy in philanthropy impact social change?",
    "options": ["Yes", "No", "Maybe", "Unsure"],
    "required": true
  },
  {
    "id": "q8",
    "type": "rating",
    "text": "Overall, how would you rate Volunteer and Advocacy Day?",
    "required": true
  },
  {
    "id": "q9",
    "type": "textarea",
    "text": "What were some of your takeaways from today?",
    "required": true
  },
  {
    "id": "q10",
    "type": "textarea",
    "text": "Additional thoughts or feedback? Feel free to expand on responses above here.",
    "required": false
  }
]$q$::jsonb
WHERE title ILIKE '%volunteer%' AND title ILIKE '%advocacy%';
