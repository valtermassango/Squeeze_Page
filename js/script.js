/* ==========================================================
   FAQ
   ========================================================== */

const questions = document.querySelectorAll(".faq-question");

questions.forEach(question => {

    question.addEventListener("click", () => {

        const current = question.parentElement;

        document.querySelectorAll(".faq-item").forEach(item => {

            if (item !== current) {
                item.classList.remove("active");
            }

        });

        current.classList.toggle("active");

    });

});


/* ==========================================================
   TESTEMUNHOS
   ========================================================== */

const students = document.querySelectorAll(".student");

const message = document.getElementById("testimonial-message");

const author = document.getElementById("testimonial-author");

let current = 0;

let interval;


function showStudent(index) {

    students.forEach(student => {
        student.classList.remove("active");
    });

    const active = students[index];

    active.classList.add("active");

    message.textContent = active.dataset.message;

    author.textContent = active.dataset.name;

    current = index;

}


function startRotation() {

    interval = setInterval(() => {

        current++;

        if (current >= students.length) {
            current = 0;
        }

        showStudent(current);

    }, 5000);

}


students.forEach((student, index) => {

    student.addEventListener("mouseenter", () => {

        clearInterval(interval);

        showStudent(index);

    });


    student.addEventListener("mouseleave", () => {

        startRotation();

    });

});


showStudent(0);

startRotation();


/* ==========================================================
   VALIDAÇÃO DO FORMULÁRIO
   ========================================================== */

const form = document.getElementById("ebook-form");
const nome = document.getElementById("nome");
const email = document.getElementById("email");
const whatsapp = document.getElementById("whatsapp");
const formSuccess = document.getElementById("form-success");


/* ==========================================================
   MOSTRAR ERRO
   ========================================================== */

function showError(input, message) {

    const group = input.closest(".input-group");

    const error = group.querySelector(".form-error");

    group.classList.remove("valid");

    group.classList.add("error");

    error.textContent = message;

}


/* ==========================================================
   MOSTRAR CAMPO VÁLIDO
   ========================================================== */

function showValid(input) {

    const group = input.closest(".input-group");

    const error = group.querySelector(".form-error");

    group.classList.remove("error");

    group.classList.add("valid");

    error.textContent = "";

}


/* ==========================================================
   VALIDAR NOME
   ========================================================== */

function validateNome() {

    const value = nome.value.trim();

    if (value === "") {

        showError(
            nome,
            "Digite seu nome."
        );

        return false;

    }


    if (value.length < 3) {

        showError(
            nome,
            "Digite seu nome completo."
        );

        return false;

    }


    showValid(nome);

    return true;

}

/* ==========================================================
   VALIDAR AO SAIR DO CAMPO
   ========================================================== */

nome.addEventListener("blur", function() {
    validateNome();
});

email.addEventListener("blur", function() {
    validateEmail();
});

whatsapp.addEventListener("blur", function() {
    validateWhatsapp();
});


/* ==========================================================
   VALIDAR EMAIL
   ========================================================== */

function validateEmail() {

    const value = email.value.trim();

    if (value === "") {

        showError(
            email,
            "Digite seu e-mail."
        );

        return false;

    }


    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(value)) {

        showError(
            email,
            "Digite um e-mail válido."
        );

        return false;

    }


    showValid(email);

    return true;

}


/* ==========================================================
   VALIDAR WHATSAPP
   ========================================================== */

function validateWhatsapp() {

    const value = whatsapp.value.trim();

    if (value === "") {

        showError(
            whatsapp,
            "Digite seu número de WhatsApp."
        );

        return false;

    }


    const digits = value.replace(/\D/g, "");


    if (digits.length < 9 || digits.length > 12) {

        showError(
            whatsapp,
            "Digite um número de WhatsApp válido."
        );

        return false;

    }


    showValid(whatsapp);

    return true;

}


/* ==========================================================
   VALIDAR FORMULÁRIO
   ========================================================== */

form.addEventListener("submit", function(event) {
    event.preventDefault();
    const nomeValido = validateNome();
    const emailValido = validateEmail();
    const whatsappValido = validateWhatsapp();

if (
    nomeValido &&
    emailValido &&
    whatsappValido
) {

    const dados = {
        nome: nome.value.trim(),
        email: email.value.trim(),
        whatsapp: whatsapp.value.trim()
    };


    console.log("Enviando dados:", dados);

    fetch("http://localhost:3002/leads", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })

    .then(response => {
        return response.json();
    })

    .then(data => {
        console.log("Resposta do servidor:", data);
        if (data.success) {
            formSuccess.classList.add("show");
        }
    })

    .catch(error => {
        console.error(
            "Erro ao enviar o formulário:",
            error
        );
    });
}


});

/* ==========================================================
   CAPTURA DE DADOS DO FORMULÁRIO
   ========================================================== */

const dados = {
    nome: nome.value.trim(),
    email: email.value.trim(),
    whatsapp: whatsapp.value.trim()
};

console.log(dados);