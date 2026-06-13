-- Load Graduation Celebration 2026 RSVP as exit ticket for the LAST program day
-- This targets whichever program day has the highest sort_order.
-- Mrs. Sykes can edit these anytime from the Exit Tickets tab.

UPDATE public.program_days
SET questions = $q$[
  {
    "id": "q1",
    "type": "text",
    "text": "Your full name",
    "required": true
  },
  {
    "id": "q2",
    "type": "single",
    "text": "Which of the following do you identify as?",
    "options": ["Student", "Liaison", "Family Member", "Community Partner / Volunteer", "Focus: HOPE Staff", "Board Member"],
    "required": true
  },
  {
    "id": "q3",
    "type": "single",
    "text": "School",
    "options": ["Berkley", "Cranbrook", "Grosse Pointe South", "Groves", "University of Detroit Jesuit", "Fitzgerald", "Fordson", "Loyola", "University Liggett", "N/A"],
    "required": true
  },
  {
    "id": "q4",
    "type": "single",
    "text": "Will you be attending the Graduation Celebration?",
    "options": ["Yes", "No"],
    "required": true
  },
  {
    "id": "q5",
    "type": "text",
    "text": "How many people are you RSVPing for? (including yourself)",
    "required": true
  },
  {
    "id": "q6",
    "type": "textarea",
    "text": "Any questions or concerns?",
    "required": false
  }
]$q$::jsonb
WHERE sort_order = (SELECT MAX(sort_order) FROM public.program_days);
