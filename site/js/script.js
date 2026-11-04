import FSRS from "./fsrs.js";
import KANJIS from "./kanjis.js";
import QUESTIONS from "./questions.js";

// ------------------------------------
// Configuration
// ------------------------------------

const params = new URLSearchParams(window.location.search);
const level = params.get("level") || "N5";
console.log(`Level is ${level}`);

function isKnownKanji(kanji) {
  if (level == "N5") {
    return KANJIS.includes(kanji);
  } else {
    return true;
  }
}

function filterQuestion(question) {
  return question.level === level && question.kanjis.some(isKnownKanji);
}

const questions = QUESTIONS.filter(filterQuestion);
console.log(`Filtered ${questions.length} questions`);

const quizLength = Math.min(10, questions.length);

// ------------------------------------
// Learning state
// ------------------------------------

const STORAGE_KEY = "ajfj2026_kanji_progress";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

let learningStates = loadProgress();

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(learningStates));
}

// Initialize new questions
questions.forEach((question) => {
  if (!learningStates[question.id]) {
    learningStates[question.id] = FSRS.createState();
  }
});

// ------------------------------------
// Quiz state
// ------------------------------------

let currentQuestion = null;
let score = 0;
let answered = false;
let seenQuestions = [];

const contextElement = document.getElementById("context");
const questionElement = document.getElementById("question");
const answersElement = document.getElementById("answers");
const counterElement = document.getElementById("question-counter");
const scoreElement = document.getElementById("score");
const progressElement = document.getElementById("progress");
const feedbackElement = document.getElementById("feedback");
const nextButton = document.getElementById("next-btn");

const quizSection = document.getElementById("quiz");
const resultsSection = document.getElementById("results");

// ------------------------------------
// Question selection
// ------------------------------------

function selectNextQuestion() {
  const selectedId = FSRS.selectQuestion(
    questions.map((q) => q.id),
    learningStates,
    seenQuestions,
  );

  if (!selectedId) {
    return null;
  }

  return questions.find((q) => q.id === selectedId);
}

// ------------------------------------
// Display question
// ------------------------------------

function showQuestion() {
  answered = false;

  currentQuestion = selectNextQuestion();

  if (!currentQuestion) {
    showResults();
    return;
  }

  seenQuestions.push(currentQuestion.id);

  contextElement.textContent = currentQuestion.context;

  questionElement.textContent = currentQuestion.question;

  counterElement.textContent = `Question ${seenQuestions.length} / ${quizLength}`;

  scoreElement.textContent = `Score : ${score}`;

  progressElement.style.width = `${((seenQuestions.length - 1) / quizLength) * 100}%`;

  feedbackElement.textContent = "Choisissez une réponse.";
  feedbackElement.className = "feedback";

  nextButton.disabled = true;
  nextButton.textContent =
    seenQuestions.length === quizLength
      ? "Voir les résultats →"
      : "Question suivante →";

  answersElement.innerHTML = "";

  currentQuestion.answers.forEach((answer, index) => {
    const button = document.createElement("button");

    button.className = "answer-btn";
    button.textContent = answer;

    button.addEventListener("click", () => {
      selectAnswer(index);
    });

    answersElement.appendChild(button);
  });
}

// ------------------------------------
// Answer handling
// ------------------------------------

function selectAnswer(selectedIndex) {
  if (answered) return;

  answered = true;

  const correct = selectedIndex === currentQuestion.correct;

  const buttons = answersElement.querySelectorAll(".answer-btn");

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === currentQuestion.correct) {
      button.classList.add("correct");
    }
  });

  // Update FSRS learning state
  const state = learningStates[currentQuestion.id];

  FSRS.review(state, correct);

  saveProgress();

  if (correct) {
    score++;

    feedbackElement.textContent = "✓ Bonne réponse !";
    feedbackElement.classList.add("success");
  } else {
    buttons[selectedIndex].classList.add("incorrect");

    feedbackElement.textContent =
      `✗ La bonne réponse est ${currentQuestion.answers[currentQuestion.correct]}.`;

    feedbackElement.classList.add("error");
  }

  scoreElement.textContent = `Score : ${score}`;

  nextButton.disabled = false;
}

// ------------------------------------
// Next question
// ------------------------------------

function nextQuestion() {
  if (!answered) return;

  if (seenQuestions.length >= quizLength) {
    showResults();
  } else {
    showQuestion();
  }
}

// ------------------------------------
// Results
// ------------------------------------

function showResults() {
  quizSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  progressElement.style.width = "100%";

  document.getElementById("final-score").textContent =
    `${score} bonnes réponses sur ${quizLength} !`;

  const percentage = (score / quizLength) * 100;

  let message;

  if (percentage === 100) {
    message = "Aucune erreur, excellent !";
  } else if (percentage >= 60) {
    message = "Bien joué, continuez comme ça !";
  } else {
    message = "Bien essayé, peut mieux faire !";
  }

  document.getElementById("result-message").textContent = message;
}

// ------------------------------------
// Restart
// ------------------------------------

function restartQuiz() {
  score = 0;
  seenQuestions = [];

  resultsSection.classList.add("hidden");
  quizSection.classList.remove("hidden");

  showQuestion();
}

// ------------------------------------
// Events
// ------------------------------------

nextButton.addEventListener("click", nextQuestion);

document.getElementById("restart-btn").addEventListener("click", restartQuiz);

// Start quiz
showQuestion();
