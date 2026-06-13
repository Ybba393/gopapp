-- Load Race & Culture Day exit ticket questions
-- This finds the program day with "Race" in its title and sets the questions.
-- Mrs. Sykes can edit these anytime from the Exit Tickets tab.

UPDATE public.program_days
SET questions = '[
  {
    "id": "q1",
    "type": "rating",
    "text": "How would you rate today'\''s breakfast?",
    "required": true
  },
  {
    "id": "q2",
    "type": "rating",
    "text": "How would you rate today'\''s lunch?",
    "required": true
  },
  {
    "id": "q3",
    "type": "rating",
    "text": "How would you rate the program day overall?",
    "required": true
  },
  {
    "id": "q4",
    "type": "multi",
    "text": "During today'\''s program day, what aspects did you enjoy the most?",
    "options": ["Jubilee Dialogues", "Artifacts of Us", "Brave Circles", "Transform the Space Activity", "Capstone Engagement"],
    "required": false
  },
  {
    "id": "q5",
    "type": "single",
    "text": "Do you feel like you have a better understanding of how identity, culture, and power shape your lived experiences and relationships with others?",
    "options": ["Yes, definitely", "Somewhat", "Not yet"],
    "required": true
  },
  {
    "id": "q6",
    "type": "textarea",
    "text": "What were your major takeaways from today?",
    "required": true
  },
  {
    "id": "q7",
    "type": "textarea",
    "text": "Any additional comments or feedback? Please share here.",
    "required": false
  },
  {
    "id": "q8",
    "type": "multi",
    "text": "Choose your top 5 critical issues — what matters most to you?",
    "options": [
      "Accessibility / Disability Justice",
      "LGBTQ+",
      "Mass Incarceration / Reform",
      "Food Insecurity",
      "Education Reform",
      "Sex Ed",
      "Religion / Faith",
      "Environmental Justice",
      "Health and Wellness",
      "Politics / Advocacy",
      "Financial Security",
      "Social Media / AI",
      "Family / Relationships",
      "Gun Control",
      "Immigration",
      "Youth Leadership"
    ],
    "maxSelect": 5,
    "required": true
  }
]'::jsonb
WHERE title ILIKE '%race%' OR title ILIKE '%culture%';
