// ==========================================================
// CADBIMOZ - SCRIPT PRINCIPAL
// ==========================================================


// ==========================================================
// 1. FAQ
// ==========================================================

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


// ==========================================================
// 2. DEPOIMENTOS / TESTEMUNHOS
// ==========================================================

const students = document.querySelectorAll(".student");

const message = document.getElementById("testimonial-message");

const author = document.getElementById("testimonial-author");

let current = 0;

let interval;


// Mostrar estudante
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


// Rotação automática
function startRotation() {

    interval = setInterval(() => {

        current++;

        if (current >= students.length) {
            current = 0;
        }

        showStudent(current);

    }, 5000);

}


// Pausar ao passar o mouse
students.forEach((student, index) => {

    student.addEventListener("mouseenter", () => {

        clearInterval(interval);

        showStudent(index);

    });


    student.addEventListener("mouseleave", () => {

        startRotation();

    });

});


// Inicializar depoimentos
if (students.length > 0) {

    showStudent(0);

    startRotation();

}


// ==========================================================
// 3. FORMULÁRIO
// ==========================================================

const form = document.getElementById("ebook-form");

const nome = document.getElementById("nome");

const email = document.getElementById("email");

const whatsapp = document.getElementById("whatsapp");

const formSuccess = document.getElementById("form-success");


// ==========================================================
// 4. FUNÇÕES DE VALIDAÇÃO
// ==========================================================


// Mostrar erro
function showError(input, message) {

    const group = input.closest(".input-group");

    const error = group.querySelector(".form-error");

    group.classList.remove("valid");

    group.classList.add("error");

    error.textContent = message;

}


// Mostrar campo válido
function showValid(input) {

    const group = input.closest(".input-group");

    const error = group.querySelector(".form-error");

    group.classList.remove("error");

    group.classList.add("valid");

    error.textContent = "";

}


// ==========================================================
// 5. VALIDAR NOME
// ==========================================================

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


// ==========================================================
// 6. VALIDAR EMAIL
// ==========================================================

function validateEmail() {

    const value = email.value.trim();


    if (value === "") {

        showError(
            email,
            "Digite seu e-mail."
        );

        return false;

    }


    // Regex para validar o formato básico do e-mail
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


// ==========================================================
// 7. VALIDAR WHATSAPP
// ==========================================================

function validateWhatsapp() {

    const value = whatsapp.value.trim();


    if (value === "") {

        showError(
            whatsapp,
            "Digite seu número de WhatsApp."
        );

        return false;

    }


    // Retirar espaços, +, -, parênteses etc.
    const digits = value.replace(/\D/g, "");


    if (
        digits.length < 9 ||
        digits.length > 12
    ) {

        showError(
            whatsapp,
            "Digite um número de WhatsApp válido."
        );

        return false;

    }


    showValid(whatsapp);

    return true;

}


// ==========================================================
// 8. VALIDAR AO SAIR DO CAMPO
// ==========================================================

nome.addEventListener("blur", () => {

    validateNome();

});


email.addEventListener("blur", () => {

    validateEmail();

});


whatsapp.addEventListener("blur", () => {

    validateWhatsapp();

});


// ==========================================================
// 9. ENVIO DO FORMULÁRIO
// ==========================================================

form.addEventListener("submit", async (event) => {

    // Impedir o comportamento normal do formulário
    event.preventDefault();


    // ======================================================
    // VALIDAR OS CAMPOS
    // ======================================================

    const nomeValido = validateNome();

    const emailValido = validateEmail();

    const whatsappValido = validateWhatsapp();


    // Se existir algum erro, parar aqui
    if (
        !nomeValido ||
        !emailValido ||
        !whatsappValido
    ) {

        return;

    }


    // ======================================================
    // RECOLHER OS DADOS
    // ======================================================

    const utm = getUTMParameters();
    const dados = {

        nome: nome.value.trim(),
        email: email.value.trim(),
        whatsapp: whatsapp.value.trim(),
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content

    };

    


    console.log("Enviando dados:");

    console.log(dados);


    // ======================================================
    // ENVIAR PARA O BACKEND
    // ======================================================

    try {

        const response = await fetch(
            "http://localhost:3002/leads",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dados)
            }
        );


        // Transformar resposta em JSON
        const data = await response.json();


        console.log("Resposta do servidor:");

        console.log(data);


        // ==================================================
        // VERIFICAR RESPOSTA
        // ==================================================

        if (data.success) {

            // ==============================================
            // SUCESSO
            // ==============================================

            formSuccess.classList.remove(
                "connection-error"
            );

            formSuccess.textContent =
                "Obrigado! Seus dados foram recebidos com sucesso.";

            formSuccess.classList.add("show");


            // Limpar formulário
            form.reset();


            // Remover estados de validação
            document
                .querySelectorAll(".input-group")
                .forEach(group => {

                    group.classList.remove(
                        "valid",
                        "error"
                    );

                });


        } else {

            // ==============================================
            // ERRO DE DUPLICAÇÃO
            // ==============================================

            if (data.field === "email") {

                showError(
                    email,
                    data.message
                );

            }


            if (data.field === "whatsapp") {

                showError(
                    whatsapp,
                    data.message
                );

            }


            console.error(
                "Erro:",
                data.message
            );

        }


    } catch (error) {

        // ==============================================
        // ERRO DE CONEXÃO COM O BACKEND
        // ==============================================

        console.error(
            "Erro ao enviar o formulário:",
            error
        );


        formSuccess.textContent =
            "Não foi possível enviar os seus dados neste momento. Tente novamente.";


        formSuccess.classList.remove("show");


        formSuccess.classList.add(
            "show",
            "connection-error"
        );

    }

});

// ==========================================================
// CAPTURAR ORIGEM DO LEAD - UTM
// ==========================================================

function getUTMParameters() {

    const params = new URLSearchParams(
        window.location.search
    );

    return {
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content")
    };

}