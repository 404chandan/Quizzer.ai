const apiUrl = 'https://quizzer-ai.onrender.com/api/quiz';

// ------------------------
// Handle Quiz Generation Form
// ------------------------
const form = document.getElementById('quizForm');
const loadingMessage = document.getElementById('loadingMessage');
const generateBtn = document.getElementById('generateBtn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const topic = document.getElementById('topic').value.trim();
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const difficulty = document.getElementById('difficulty').value;

    if (!topic || !numQuestions || !difficulty) {
      alert('Please fill all fields');
      return;
    }

    // Show loading
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }

    try {
      const res = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions, difficulty }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const data = await res.json();
      localStorage.setItem('currentQuiz', JSON.stringify(data));
      window.location.href = 'quiz.html';
    } catch (err) {
      alert(`Error generating quiz: ${err.message}`);
      console.error(err);
    } finally {
      // Hide loading
      if (loadingMessage) loadingMessage.style.display = 'none';
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Quiz';
      }
    }
  });
}

// ------------------------
// Render Quiz Page
// ------------------------
const quizContainer = document.getElementById('quiz');
if (quizContainer) {
  const quiz = JSON.parse(localStorage.getItem('currentQuiz'));

  if (!quiz) {
    quizContainer.innerHTML = "<p>No quiz loaded. Please generate a quiz first.</p>";
  } else {
    quiz.questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'question-block';
      div.innerHTML = `<h3>${index + 1}. ${q.question}</h3>`;

      q.options.forEach(opt => {
        div.innerHTML += `
          <label class="option-label">
            <input type="radio" name="q${index}" value="${opt}">
            ${opt}
          </label><br>
        `;
      });

      quizContainer.appendChild(div);
    });

    window.submitQuiz = () => {
      let score = 0;
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '';

      quiz.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const userAnswer = selected ? selected.value : 'No Answer';
        const isCorrect = userAnswer === q.correctAnswer;

        if (isCorrect) score++;

        const questionResult = document.createElement('div');
        questionResult.className = 'result-block';
        questionResult.innerHTML = `
          <h3>${index + 1}. ${q.question}</h3>
          <p>Your Answer: <b style="color:${isCorrect ? 'green' : 'red'}">
            ${userAnswer}</b> ${isCorrect ? '✅' : '❌'}</p>
          <p>Correct Answer: <b style="color:green">${q.correctAnswer}</b></p>
        `;

        resultDiv.appendChild(questionResult);
      });

      const scoreDisplay = document.createElement('h2');
      scoreDisplay.innerText = `🎯 You scored ${score} out of ${quiz.numQuestions}`;
      resultDiv.prepend(scoreDisplay);
    };
  }
}

// ------------------------
// Load Quiz History
// ------------------------
const historyContainer = document.getElementById('history');
if (historyContainer) {
  fetch(`${apiUrl}/history`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        historyContainer.innerHTML = '<p>No quiz history available.</p>';
        return;
      }

      const recentQuizzes = data.slice(0, 3);

      recentQuizzes.forEach((quiz, quizIndex) => {
        const div = document.createElement('div');
        div.className = 'history-block';

        div.innerHTML = `
          <h3>📚 ${quiz.topic.toUpperCase()} (${quiz.difficulty})</h3>
          <p><strong>Date:</strong> ${new Date(quiz.dateCreated).toLocaleString()}</p>
          <ul>
            ${quiz.questions.map((q, index) => `
              <li>
                <strong>Q${index + 1}:</strong> ${q.question}<br>
                ${q.options.map(opt => `
                  <label style="margin-left: 20px;">
                    <input type="radio" disabled ${opt === q.correctAnswer ? 'checked' : ''}>
                    ${opt}
                  </label><br>
                `).join('')}
                <strong style="color:green; margin-left:20px;">✔ Correct Answer: ${q.correctAnswer}</strong>
              </li>
            `).join('')}
          </ul>
          <button class="reattempt-btn" onclick="reattemptQuiz(${quizIndex})">🔄 Reattempt</button>
          <button class="delete-btn" onclick="deleteQuiz('${quiz._id}', this)">🗑️ Delete</button>
        `;

        historyContainer.appendChild(div);
      });

      localStorage.setItem('recentQuizzes', JSON.stringify(recentQuizzes));
    })
    .catch(err => {
      historyContainer.innerHTML = `<p>Error loading history: ${err.message}</p>`;
      console.error(err);
    });
}

// ------------------------
// Reattempt Quiz
// ------------------------
function reattemptQuiz(index) {
  const recentQuizzes = JSON.parse(localStorage.getItem('recentQuizzes'));
  const selectedQuiz = recentQuizzes[index];

  localStorage.setItem('currentQuiz', JSON.stringify(selectedQuiz));
  window.location.href = 'quiz.html';
}

// ------------------------
// Delete Quiz
// ------------------------
function deleteQuiz(id, button) {
  const confirmDelete = confirm('Are you sure you want to delete this quiz?');
  if (!confirmDelete) return;

  fetch(`${apiUrl}/${id}`, {
    method: 'DELETE',
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
      const block = button.closest('.history-block');
      block.remove();
      alert('Quiz deleted successfully');
    })
    .catch(err => {
      alert('Error deleting quiz');
      console.error(err);
    });
}
