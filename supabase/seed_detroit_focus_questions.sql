-- Load Detroit Focus Day (2025) exit ticket questions
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
    "text": "How would you rate your Detroit Historical Museum Scavenger Hunt Experience?",
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
    "text": "How would you rate the Bus Tour w/ Historian Jamon Jordan?",
    "required": true
  },
  {
    "id": "q5",
    "type": "rating",
    "text": "Overall, how would you rate Detroit Focus Day?",
    "required": true
  },
  {
    "id": "q6",
    "type": "multi",
    "text": "What aspects did you enjoy most today? (Check all that apply)",
    "options": ["Museum Scavenger Hunt", "Bus Tour", "Capstone Engagement"],
    "required": false
  },
  {
    "id": "q7",
    "type": "single",
    "text": "Do you feel like you have a better understanding of this era of Detroit's history and its impact on present day?",
    "options": ["Yes", "No", "Maybe", "Unsure"],
    "required": true
  },
  {
    "id": "q8",
    "type": "textarea",
    "text": "What were some of your takeaways from today?",
    "required": true
  },
  {
    "id": "q9",
    "type": "textarea",
    "text": "Additional thoughts or feedback?",
    "required": false
  }
]$q$::jsonb
WHERE title ILIKE '%detroit%' AND title ILIKE '%focus%';
