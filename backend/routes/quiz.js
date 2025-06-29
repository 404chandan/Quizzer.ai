const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = 'gemini-2.5-pro';

// ----------------------------------------
// 🔥 Route: Generate Quiz
// ----------------------------------------
router.post('/generate', async (req, res) => {
  const { topic, numQuestions, difficulty } = req.body;

  if (!topic || !numQuestions || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const prompt = `
Generate ${numQuestions} ${difficulty} level multiple-choice questions about ${topic}.
Each question must have:
- A numbered question like "1. What is..."
- Four options labeled a), b), c), d)
- A clear line at the end with 'Answer: <Correct Option Text>'

Example:
1. What is the capital of France?
a) Berlin
b) Madrid
c) Paris
d) Rome
Answer: c) Paris
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'Failed to get response from Gemini' });
    }

    console.log('Gemini Response:\n', text);

    const questions = parseQuestions(text);

    if (!questions.length) {
      return res.status(500).json({ error: 'No questions parsed from response' });
    }

    const newQuiz = new Quiz({
      topic,
      difficulty,
      numQuestions,
      questions,
    });

    await newQuiz.save();
    res.json(newQuiz);

  } catch (err) {
    console.error('❌ Error from Gemini API:', err.response?.data || err.message);
    res.status(500).json({ error: 'Server error generating quiz' });
  }
});

// ----------------------------------------
// 📜 Route: Get Quiz History
// ----------------------------------------
router.get('/history', async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ dateCreated: -1 });
    res.json(quizzes);
  } catch (err) {
    console.error('❌ Error fetching history:', err);
    res.status(500).json({ error: 'Error fetching quiz history' });
  }
});

// ----------------------------------------
// 🗑️ Route: Delete Quiz by ID
// ----------------------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // ✅ Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid quiz ID' });
  }

  try {
    const deletedQuiz = await Quiz.findByIdAndDelete(id);

    if (!deletedQuiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting quiz:', err);
    res.status(500).json({ message: 'Server error while deleting' });
  }
});

// ----------------------------------------
// 🧠 Helper Function: Parse Gemini Response
// ----------------------------------------
function parseQuestions(text) {
  const questions = [];
  const blocks = text.split(/\n(?=\d+\.)/); // Split by lines starting with number like "1."

  blocks.forEach(block => {
    const lines = block.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return;

    const questionLine = lines[0].replace(/^\d+\.\s*/, '').trim();

    const options = [];
    let correctAnswer = '';

    lines.slice(1).forEach(line => {
      const optMatch = line.match(/^[a-dA-D][).]\s*(.+)/);
      if (optMatch) {
        options.push(optMatch[1].trim());
      } else {
        const answerMatch = line.match(/Answer[:\-]?\s*([a-dA-D])[).]?\s*(.+)?/i);
        if (answerMatch) {
          const optionLetter = answerMatch[1].toLowerCase();
          const index = { a: 0, b: 1, c: 2, d: 3 }[optionLetter];
          if (index !== undefined && options[index]) {
            correctAnswer = options[index];
          } else if (answerMatch[2]) {
            correctAnswer = answerMatch[2].trim();
          }
        }
      }
    });

    if (!correctAnswer && options.length) {
      correctAnswer = options[0]; // fallback
    }

    if (questionLine && options.length === 4) {
      questions.push({
        question: questionLine,
        options,
        correctAnswer,
      });
    }
  });

  return questions;
}

module.exports = router;
