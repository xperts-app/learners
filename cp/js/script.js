// js/scripts.js

document.addEventListener('DOMContentLoaded', () => {
    // Shared function to get URL parameters
    const getUrlParam = (param) => new URLSearchParams(window.location.search).get(param);

    // --- Page-specific Logic ---
    if (document.body.id === 'page-teacher') {
        initTeacherPage();
    }
    if (document.body.id === 'page-student-setup') {
        initStudentSetupPage();
    }
    if (document.body.id === 'page-quiz') {
        initQuizPage();
    }
    if (document.body.id === 'page-result') {
        initResultPage();
    }
    if (document.body.id === 'page-review') {
        initReviewPage();
    }
    if (document.body.id === 'page-improvement') {
        initImprovementPage();
    }
    if (document.body.id === 'page-index') {
        initIndexPage();
    }
});

// --- INDEX PAGE ---
function initIndexPage() {
    const classContainer = document.getElementById('class-container');
    for (const className in academicData) {
        const classCard = document.createElement('div');
        classCard.className = 'card';
        classCard.innerHTML = `<h3>${className}</h3>`;
        const subjectList = document.createElement('ul');
        for (const subjectName in academicData[className]) {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `2_student_setup.html?class=${encodeURIComponent(className)}&subject=${encodeURIComponent(subjectName)}`;
            link.textContent = subjectName;
            li.appendChild(link);
            subjectList.appendChild(li);
        }
        classCard.appendChild(subjectList);
        classContainer.appendChild(classCard);
    }
}


// --- 1. TEACHER PAGE ---
function initTeacherPage() {
    const classSelect = document.getElementById('class-select');
    const subjectSelect = document.getElementById('subject-select');
    const chapterSelect = document.getElementById('chapter-select');
    const questionForm = document.getElementById('question-form');

    // Populate Class
    for (const className in academicData) {
        classSelect.innerHTML += `<option value="${className}">${className}</option>`;
    }

    // Populate Subject on Class change
    classSelect.addEventListener('change', () => {
        const selectedClass = classSelect.value;
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
        if (selectedClass) {
            for (const subjectName in academicData[selectedClass]) {
                subjectSelect.innerHTML += `<option value="${subjectName}">${subjectName}</option>`;
            }
        }
    });

    // Populate Chapter on Subject change
    subjectSelect.addEventListener('change', () => {
        const selectedClass = classSelect.value;
        const selectedSubject = subjectSelect.value;
        chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
        if (selectedSubject) {
            academicData[selectedClass][selectedSubject].forEach(chapter => {
                chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
            });
        }
    });
    
    // Handle Form Submission
    questionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const questionData = {
            class: classSelect.value,
            subject: subjectSelect.value,
            chapter: chapterSelect.value,
            difficulty: document.getElementById('difficulty-select').value,
            questionText: document.getElementById('question-text').value,
            options: {
                A: document.getElementById('option-a').value,
                B: document.getElementById('option-b').value,
                C: document.getElementById('option-c').value,
                D: document.getElementById('option-d').value,
            },
            correctAnswer: document.getElementById('correct-answer').value,
            solution: document.getElementById('solution-text').value
        };

        // Path: /questions/ClassName/SubjectName/ChapterName
        const dbPath = `questions/${questionData.class}/${questionData.subject}/${questionData.chapter}`;
        
        // Push data to Firebase
        db.ref(dbPath).push(questionData)
            .then(() => {
                alert('Question saved successfully!');
                questionForm.reset();
                classSelect.dispatchEvent(new Event('change')); // Reset dropdowns
            })
            .catch(error => {
                console.error("Error saving question: ", error);
                alert('Error saving question. Check console.');
            });
    });
}


// --- 2. STUDENT SETUP PAGE ---
function initStudentSetupPage() {
    const getUrlParam = (param) => new URLSearchParams(window.location.search).get(param);
    const className = decodeURIComponent(getUrlParam('class'));
    const subjectName = decodeURIComponent(getUrlParam('subject'));

    document.getElementById('header-title').textContent = subjectName;
    document.getElementById('header-class').textContent = className;

    const chaptersContainer = document.getElementById('chapters-container');
    const chapters = academicData[className][subjectName];
    chapters.forEach(chapter => {
        chaptersContainer.innerHTML += `
            <div class="form-group">
                <input type="checkbox" id="${chapter}" name="chapter" value="${chapter}">
                <label for="${chapter}">${chapter}</label>
            </div>
        `;
    });

    document.getElementById('setup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedChapters = Array.from(document.querySelectorAll('input[name="chapter"]:checked')).map(cb => cb.value);
        const difficulty = document.getElementById('difficulty-level').value;
        const numQuestions = document.getElementById('num-questions').value;

        if (selectedChapters.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }

        // Fetch questions from Firebase
        const promises = selectedChapters.map(chapter => {
            const dbPath = `questions/${className}/${subjectName}/${chapter}`;
            return db.ref(dbPath).once('value');
        });

        Promise.all(promises).then(snapshots => {
            let allQuestions = [];
            snapshots.forEach(snapshot => {
                const questions = snapshot.val();
                if (questions) {
                    // Convert Firebase object to array and add keys
                    Object.entries(questions).forEach(([key, value]) => {
                        allQuestions.push({ ...value, id: key });
                    });
                }
            });

            // Filter by difficulty
            let filteredQuestions = allQuestions;
            if (difficulty !== 'All') {
                filteredQuestions = allQuestions.filter(q => q.difficulty === difficulty);
            }

            // Shuffle and slice
            const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
            const quizQuestions = shuffled.slice(0, numQuestions);

            if (quizQuestions.length === 0) {
                alert('No questions found for the selected criteria. Please try different options.');
                return;
            }

            // Store in sessionStorage for the quiz
            sessionStorage.setItem('currentQuiz', JSON.stringify(quizQuestions));
            window.location.href = '3_quiz.html';
        });
    });
}


// --- 3. QUIZ PAGE ---
function initQuizPage() {
    const quizWrapper = document.getElementById('quiz-wrapper');
    const questionNumberEl = document.getElementById('question-number');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    const quizQuestions = JSON.parse(sessionStorage.getItem('currentQuiz'));
    if (!quizQuestions || quizQuestions.length === 0) {
        alert('No quiz found. Redirecting to setup.');
        window.location.href = '2_student_setup.html';
        return;
    }

    let currentQuestionIndex = 0;
    const userAnswers = new Array(quizQuestions.length).fill(null);
    
    const renderQuestion = () => {
        quizWrapper.innerHTML = ''; // Clear previous
        quizQuestions.forEach((q, index) => {
            const slide = document.createElement('div');
            slide.className = 'question-slide';
            slide.innerHTML = `
                <h3>Q${index + 1}: ${q.questionText}</h3>
                <div class="options-container" data-question-index="${index}">
                    <div class="option" data-option="A"><strong>A:</strong> ${q.options.A}</div>
                    <div class="option" data-option="B"><strong>B:</strong> ${q.options.B}</div>
                    <div class="option" data-option="C"><strong>C:</strong> ${q.options.C}</div>
                    <div class="option" data-option="D"><strong>D:</strong> ${q.options.D}</div>
                </div>
            `;
            quizWrapper.appendChild(slide);
        });
        updateCarousel();
        addOptionListeners();
    };

    const updateCarousel = () => {
        quizWrapper.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
        questionNumberEl.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'none' : 'inline-block';
        submitBtn.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'inline-block' : 'none';
    };

    const addOptionListeners = () => {
        document.querySelectorAll('.option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                const questionIndex = parseInt(optionEl.parentElement.dataset.questionIndex);
                const selectedOption = optionEl.dataset.option;
                userAnswers[questionIndex] = selectedOption;

                // Update visual selection
                optionEl.parentElement.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                optionEl.classList.add('selected');
            });
        });
    };

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateCarousel();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            currentQuestionIndex++;
            updateCarousel();
        }
    });

    submitBtn.addEventListener('click', () => {
        // Prepare data for result page
        const resultData = quizQuestions.map((q, i) => ({
            ...q,
            userAnswer: userAnswers[i]
        }));

        // Store in localStorage for persistence (review and improvement book)
        localStorage.setItem('lastQuizResult', JSON.stringify(resultData));

        // Update improvement book
        updateImprovementBook(resultData);

        window.location.href = '4_result.html';
    });

    renderQuestion();
}


// --- 4. RESULT PAGE ---
function initResultPage() {
    const resultData = JSON.parse(localStorage.getItem('lastQuizResult'));
    if (!resultData) {
        window.location.href = 'index.html';
        return;
    }

    let correctCount = 0;
    resultData.forEach(q => {
        if (q.userAnswer === q.correctAnswer) {
            correctCount++;
        }
    });

    const totalQuestions = resultData.length;
    const marks = correctCount * 4 - (totalQuestions - correctCount); // Example scoring: +4 for correct, -1 for incorrect

    document.getElementById('correct-count').textContent = `${correctCount}/${totalQuestions}`;
    document.getElementById('marks-count').textContent = marks;
}

// --- 5. REVIEW PAGE ---
function initReviewPage() {
    const resultData = JSON.parse(localStorage.getItem('lastQuizResult'));
    const reviewList = document.getElementById('review-list');
    const reviewDetail = document.getElementById('review-detail');
    
    if (!resultData) {
        reviewList.innerHTML = '<p>No quiz result found to review.</p>';
        return;
    }

    resultData.forEach((q, index) => {
        const isCorrect = q.userAnswer === q.correctAnswer;
        const item = document.createElement('div');
        item.className = `question-item ${isCorrect ? 'correct' : 'incorrect'}`;
        item.textContent = `Question ${index + 1}`;
        item.addEventListener('click', () => showReviewDetail(q, index));
        reviewList.appendChild(item);
    });

    const showReviewDetail = (q, index) => {
        const isCorrect = q.userAnswer === q.correctAnswer;
        reviewDetail.innerHTML = `
            <div class="card">
                <h3>Question ${index + 1}</h3>
                <p>${q.questionText}</p>
                <div class="options-container">
                    ${Object.keys(q.options).map(key => `
                        <div class="option 
                            ${q.correctAnswer === key ? 'correct' : ''} 
                            ${q.userAnswer === key && !isCorrect ? 'incorrect' : ''}
                        ">
                            <strong>${key}:</strong> ${q.options[key]}
                        </div>
                    `).join('')}
                </div>
                <hr>
                <p><strong>Your Answer:</strong> ${q.userAnswer || 'Not Answered'}</p>
                <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
                <h4>Solution:</h4>
                <p>${q.solution}</p>
            </div>
        `;
        reviewDetail.scrollIntoView({ behavior: 'smooth' });
    };
}


// --- 6. IMPROVEMENT BOOK PAGE ---
function initImprovementPage() {
    const improvementContainer = document.getElementById('improvement-container');
    const improvementBook = JSON.parse(localStorage.getItem('improvementBook')) || {};

    if (Object.keys(improvementBook).length === 0) {
        improvementContainer.innerHTML = '<p>Your improvement book is empty. Keep practicing!</p>';
        return;
    }

    let html = '';
    // Group by Subject -> Chapter
    const groupedBySubject = {};
    Object.values(improvementBook).forEach(q => {
        if (!groupedBySubject[q.subject]) {
            groupedBySubject[q.subject] = {};
        }
        if (!groupedBySubject[q.subject][q.chapter]) {
            groupedBySubject[q.subject][q.chapter] = [];
        }
        groupedBySubject[q.subject][q.chapter].push(q);
    });
    
    for (const subject in groupedBySubject) {
        html += `<h2>${subject}</h2>`;
        for (const chapter in groupedBySubject[subject]) {
            const mistakes = groupedBySubject[subject][chapter];
            const mistakeCount = mistakes.length;
            html += `
                <div class="card">
                    <div class="card-header">
                        <span>${chapter}</span>
                        <span>^</span>
                    </div>
                    <p>${mistakeCount} Mistakes</p>
                    <button class="btn btn-primary re-attempt-btn" data-subject="${subject}" data-chapter="${chapter}">Re-attempt</button>
                </div>
            `;
        }
    }
    improvementContainer.innerHTML = html;
    
    document.querySelectorAll('.re-attempt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const subject = btn.dataset.subject;
            const chapter = btn.dataset.chapter;
            const questionsToReattempt = groupedBySubject[subject][chapter];
            
            // Start a new quiz with these questions
            sessionStorage.setItem('currentQuiz', JSON.stringify(questionsToReattempt));
            window.location.href = '3_quiz.html';
        });
    });
}

// --- HELPER FUNCTIONS ---
function updateImprovementBook(resultData) {
    const incorrectQuestions = resultData.filter(q => q.userAnswer !== q.correctAnswer);
    if (incorrectQuestions.length === 0) return;

    // Get existing book from localStorage
    const improvementBook = JSON.parse(localStorage.getItem('improvementBook')) || {};

    // Add new incorrect questions, using question ID as key to avoid duplicates
    incorrectQuestions.forEach(q => {
        improvementBook[q.id] = q; // q.id comes from the firebase key
    });
    
    // Save updated book
    localStorage.setItem('improvementBook', JSON.stringify(improvementBook));
}
