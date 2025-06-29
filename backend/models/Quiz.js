const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
});

const quizSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  difficulty: { type: String, required: true },
  numQuestions: { type: Number, required: true },
  questions: [questionSchema],
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Quiz', quizSchema);
