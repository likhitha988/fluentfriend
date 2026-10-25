/**
 * Static practice content (prompts, scenarios, topics). This is curriculum data, not mock data:
 * the AI conversation that follows each prompt is always generated live.
 */

export interface Challenge {
  id: string;
  category: 'memory' | 'story' | 'opinion' | 'describe' | 'vocab' | 'plans';
  title: string;
  prompt: string;
}

export const DAILY_CHALLENGES: Challenge[] = [
  { id: 'memorable-day', category: 'memory', title: 'My Most Memorable Day', prompt: 'Tell me about a day you will never forget. What happened, and why was it special?' },
  { id: 'last-weekend', category: 'story', title: 'Last Weekend', prompt: 'Tell me the story of your last weekend, from morning to night.' },
  { id: 'favorite-food', category: 'opinion', title: 'A Food You Love', prompt: 'What is a food you could eat every week? Describe it and explain why you love it.' },
  { id: 'good-friend', category: 'memory', title: 'A Good Friend', prompt: 'Tell me about a friend who matters to you. How did you meet?' },
  { id: 'dream-trip', category: 'plans', title: 'A Dream Trip', prompt: 'If you could travel anywhere next month, where would you go and what would you do there?' },
  { id: 'funny-moment', category: 'story', title: 'A Funny Moment', prompt: 'Tell me about a time you laughed a lot. What was going on?' },
  { id: 'morning-routine', category: 'describe', title: 'My Morning Routine', prompt: 'Walk me through a normal morning for you. What do you do first, and what do you do next?' },
  { id: 'festival', category: 'memory', title: 'A Festival I Enjoy', prompt: 'Which festival or celebration do you enjoy most? Tell me how you celebrate it.' },
  { id: 'new-skill', category: 'plans', title: 'Something New to Learn', prompt: 'What is one new thing you would like to learn this year, and why?' },
  { id: 'favorite-movie', category: 'opinion', title: 'A Movie or Show', prompt: 'Tell me about a movie or series you enjoyed recently. What did you like about it?' },
  { id: 'small-win', category: 'story', title: 'A Small Win', prompt: 'Tell me about something that went well for you recently, even if it was small.' },
  { id: 'place-describe', category: 'describe', title: 'My Favorite Place', prompt: 'Describe a place where you feel relaxed. What can you see, hear and do there?' },
  { id: 'words-practice', category: 'vocab', title: 'Use My New Words', prompt: 'Tell me about your week and try to use words from your vocabulary notebook.' },
  { id: 'weekend-plans', category: 'plans', title: 'Weekend Plans', prompt: 'What are you planning to do this weekend? Tell me the plan and who you will do it with.' },
];

export const TOPICS_OF_THE_DAY = [
  'Weekend plans', 'Favorite music', 'College or work life', 'Street food', 'Festivals at home',
  'Best advice you received', 'A trip you remember', 'Hobbies and free time', 'Rainy days',
  'Family traditions', 'Shopping habits', 'Movies with friends', 'Your dream job',
];

export const QUESTIONS_OF_THE_DAY = [
  'What made you smile today?',
  'What is something you are looking forward to?',
  'If you had a free afternoon, how would you spend it?',
  'What is a small habit that makes your day better?',
  'Who do you talk to the most, and what do you usually talk about?',
  'What was the best meal you had this month?',
  'What is one thing you would change about your daily routine?',
  'What kind of weather do you enjoy most, and why?',
  'What is a song you can listen to again and again?',
  'Tell me about a place you visited that surprised you.',
];

export interface RolePlay {
  id: string;
  title: string;
  /** Who the AI plays and where we are. Used in the system prompt. */
  setup: string;
  /** Short line shown to the learner before they start. */
  blurb: string;
}

export const ROLE_PLAYS: RolePlay[] = [
  { id: 'new-friend', title: 'Meeting a new friend', blurb: 'You meet someone friendly at a get-together.', setup: 'You are a friendly person the user has just met at a small get-together. Keep the small talk natural and curious.' },
  { id: 'classmate', title: 'Talking to a classmate', blurb: 'Chat with a classmate before class starts.', setup: 'You are a classmate chatting with the user before class begins. Talk about classes, weekend, plans and campus life.' },
  { id: 'restaurant', title: 'Ordering food', blurb: 'You are at a restaurant and the waiter comes over.', setup: 'You are a waiter at a casual restaurant. Take the order step by step, answer questions about the menu (invent a believable menu), and be polite.' },
  { id: 'shopping', title: 'Shopping at a store', blurb: 'You want to buy something and need help.', setup: 'You are a shop assistant in a clothing and accessories store. Help the user find something, discuss size, colour and price, and handle a small negotiation or return politely.' },
  { id: 'directions', title: 'Asking for directions', blurb: 'You are lost and ask a stranger for help.', setup: 'You are a helpful local person on the street. The user will ask for directions. Give directions in short steps and check they understood.' },
  { id: 'phone-call', title: 'Making a phone call', blurb: 'Call a salon or clinic to book a time.', setup: 'You are a receptionist answering the phone at a local clinic or salon. Ask what the user needs, offer times, and confirm details. Speak the way people do on the phone.' },
  { id: 'movie-talk', title: 'Talking about a movie', blurb: 'Share what you thought about a film.', setup: 'You are a friend who also enjoys movies. Ask what the user watched recently, share your own opinions, and respectfully disagree sometimes.' },
  { id: 'weekend-plans', title: 'Sharing weekend plans', blurb: 'Make plans with a friend.', setup: 'You are a friend trying to make plans for the weekend. Suggest ideas, ask about preferences and agree on a time and place.' },
  { id: 'polite-opinion', title: 'Giving an opinion politely', blurb: 'Disagree without sounding rude.', setup: 'You are a friend who holds a mild opinion on an everyday topic (for example, where to eat or which film to watch). Let the user practise agreeing, disagreeing politely and giving reasons.' },
  { id: 'stranger', title: 'Chatting with a stranger', blurb: 'Start and keep a conversation going.', setup: 'You are a friendly stranger sitting next to the user at a coffee shop or bus stop. Let the user start the conversation and keep it going with natural questions.' },
];

export const STORY_PROMPTS = [
  { id: 'story-last-trip', title: 'Tell a story: a trip', prompt: 'Tell me about a trip you took. Start from how you got ready and finish with how it ended.' },
  { id: 'story-surprise', title: 'Tell a story: a surprise', prompt: 'Tell me about a time something unexpected happened to you.' },
  { id: 'story-lesson', title: 'Tell a story: a lesson', prompt: 'Tell me about a mistake that taught you something useful.' },
  { id: 'story-retell', title: 'Retell a short story', prompt: 'I will tell you a very short story. Listen, then tell it back in your own words.' },
];

export const OPINION_PROMPTS = [
  { id: 'op-city-village', title: 'City life or village life?', prompt: 'Which do you prefer, city life or village life? Give reasons and examples.' },
  { id: 'op-phone', title: 'Phones at the dinner table', prompt: 'Is it rude to use your phone while eating with friends? Explain what you think.' },
  { id: 'op-early-late', title: 'Early bird or night owl', prompt: 'Are you a morning person or a night person? Why do you think so?' },
  { id: 'op-movies-home', title: 'Cinema or home?', prompt: 'Do you prefer watching films in a cinema or at home? Tell me why.' },
];

export const TIMED_EXERCISES = [
  { id: 'timed-30', seconds: 30, title: '30-second talk', prompt: 'Tell me about your favorite way to spend a free evening.' },
  { id: 'timed-60', seconds: 60, title: '1-minute talk', prompt: 'Describe your best friend. What are they like, and why are you close?' },
  { id: 'timed-120', seconds: 120, title: '2-minute talk', prompt: 'Talk about a goal you have for this year and how you plan to reach it.' },
];

export const DESCRIBE_PROMPTS = [
  { id: 'desc-market', title: 'Describe a busy market', prompt: 'Imagine a busy street market. Describe what you can see, hear and smell.' },
  { id: 'desc-railway', title: 'Describe a railway station', prompt: 'Imagine you are at a crowded railway station. Describe the scene to me.' },
  { id: 'desc-rainy', title: 'Describe a rainy afternoon', prompt: 'Describe a rainy afternoon at home or at college.' },
];

export const SUGGESTED_TOPICS = [
  { id: 't-weekend', title: 'My weekend', topic: 'what the user did or will do this weekend' },
  { id: 't-food', title: 'Food I love', topic: 'favourite foods and meals' },
  { id: 't-music', title: 'Music and movies', topic: 'music, movies and shows the user enjoys' },
  { id: 't-college', title: 'Daily life', topic: "the user's daily routine, college or work life (keep it everyday, not technical)" },
  { id: 't-travel', title: 'Travel and places', topic: 'places the user has visited or wants to visit' },
  { id: 't-goals', title: 'Goals and dreams', topic: 'personal goals, dreams and plans' },
];

/** Plain-language tip for each correction category, shown on the Progress page. */
export const CATEGORY_TIPS: Record<string, { label: string; tip: string }> = {
  past_tense: { label: 'Past tense', tip: 'Tell short stories about yesterday or last weekend. Notice how the verb changes: go → went, meet → met.' },
  present_tense: { label: 'Present tense', tip: 'Describe your daily routine. Keep each sentence short and check the verb form.' },
  future_forms: { label: 'Talking about the future', tip: 'Share plans for tomorrow or next week using "I\'m going to…" and "I will…".' },
  articles: { label: 'a / an / the', tip: 'Say "a" for something new (a friend) and "the" for something already known (the friend I told you about).' },
  prepositions: { label: 'Prepositions', tip: 'Learn them in phrases: "at home", "on Monday", "in the morning", "good at".' },
  subject_verb_agreement: { label: 'Subject–verb agreement', tip: 'With he/she/it, the verb usually takes -s: "She likes tea."' },
  word_order: { label: 'Word order', tip: 'Start with who, then the action, then the details: "I met my friend at the mall."' },
  plurals: { label: 'Singular and plural', tip: 'Check words after numbers and "many": "two friends", "many people".' },
  pronouns: { label: 'Pronouns', tip: 'Match he/she/they with the person you mean, and use "my/his/her" for belonging.' },
  word_choice: { label: 'Choosing the right word', tip: 'Save new words in context and try them in a full sentence of your own.' },
  natural_phrasing: { label: 'Natural phrasing', tip: 'Your sentences are understandable. Listen for how native speakers say the same thing, then try both versions.' },
  other: { label: 'Other', tip: 'Keep speaking in full sentences. Repeat the improved version out loud once.' },
};
