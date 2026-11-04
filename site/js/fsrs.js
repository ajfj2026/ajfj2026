/*
 * Property     Meaning
 * --------     -------
 * difficulty   How difficult the question is (1–10)
 * stability    Estimated memory stability in days
 * lastReview   Date of the last answer
 * dueDate      Next scheduled review
 * reps         Number of successful reviews
 * lapses       Number of incorrect answers
 */

const DAY = 24 * 60 * 60 * 1000;

const INITIAL_STABILITY = 1;
const MIN_STABILITY = 0.1;
const DESIRED_RETENTION = 0.9;

// Create initial memory state for a question
function createState() {
  return {
    difficulty: 5,
    stability: INITIAL_STABILITY,
    lastReview: null,
    dueDate: Date.now(),
    reps: 0,
    lapses: 0,
  };
}

// Calculate estimated probability of remembering
function retrievability(state, now = Date.now()) {
  if (!state.lastReview) return 0;

  const elapsed = (now - state.lastReview) / DAY;

  return Math.exp((Math.log(DESIRED_RETENTION) * elapsed) / state.stability);
}

// Update memory state after an answer
function review(state, correct) {
  const now = Date.now();

  const elapsed = state.lastReview ? (now - state.lastReview) / DAY : 0;

  if (correct) {
    if (state.reps === 0) {
      state.stability = INITIAL_STABILITY;
    } else {
      const recall = retrievability(state, now);

      // Increase stability according to recall difficulty
      const growth =
        1 + (0.5 * (11 - state.difficulty)) / 10 + 0.5 * (1 - recall);

      state.stability = Math.max(state.stability, state.stability * growth);
    }

    state.reps++;

    // A successful answer slightly reduces difficulty
    state.difficulty = Math.max(1, state.difficulty - 0.3);

    state.lastReview = now;
    state.dueDate = now + state.stability * DAY;
  } else {
    state.lapses++;

    state.difficulty = Math.min(10, state.difficulty + 1);

    state.stability = Math.max(MIN_STABILITY, state.stability * 0.3);

    state.lastReview = now;

    // Retry after 10 minutes
    state.dueDate = now + 10 * 60 * 1000;
  }

  return state;
}

// Calculate question priority
function priority(state, now = Date.now()) {
  if (!state.lastReview) {
    return 1000;
  }

  const remaining = state.dueDate - now;
  const recall = retrievability(state, now);

  if (remaining <= 0) {
    const overdueDays = Math.abs(remaining) / DAY;

    return 100 + overdueDays * 10 + (1 - recall) * 50;
  }

  // Future questions receive a lower priority
  return 10 / (1 + remaining / DAY);
}

// Select the next question
function selectQuestion(questionIds, states, excluded = []) {
  const now = Date.now();

  const available = questionIds.filter((id) => !excluded.includes(id));

  if (available.length === 0) {
    return null;
  }

  const candidates = available.map((id) => ({
    id,
    state: states[id] || createState(),
  }));

  // Sort by highest review priority
  candidates.sort((a, b) => {
    return priority(b.state, now) - priority(a.state, now);
  });

  // Randomize among the most relevant candidates
  const bestPriority = priority(candidates[0].state, now);

  const bestCandidates = candidates.filter((candidate) => {
    return priority(candidate.state, now) >= bestPriority * 0.9;
  });

  const selected =
    bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

  return selected.id;
}

export default {
  createState,
  retrievability,
  review,
  priority,
  selectQuestion,
};
