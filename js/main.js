const questions = document.querySelectorAll(".faq-question");

questions.forEach(question=>{

    question.addEventListener("click",()=>{

        const current = question.parentElement;

        document.querySelectorAll(".faq-item").forEach(item=>{

            if(item!==current){

                item.classList.remove("active");

            }

        });

        current.classList.toggle("active");

    });

});

const students = document.querySelectorAll(".student");

const message = document.getElementById("testimonial-message");

const author = document.getElementById("testimonial-author");

let current = 0;

let interval;

function showStudent(index){

    students.forEach(student=>{

        student.classList.remove("active");

    });

    const active = students[index];

    active.classList.add("active");

    message.textContent = active.dataset.message;

    author.textContent = active.dataset.name;

    current=index;

}

function startRotation(){

    interval=setInterval(()=>{

        current++;

        if(current>=students.length){

            current=0;

        }

        showStudent(current);

    },5000);

}

students.forEach((student,index)=>{

    student.addEventListener("mouseenter",()=>{

        clearInterval(interval);

        showStudent(index);

    });

    student.addEventListener("mouseleave",()=>{

        startRotation();

    });

});

showStudent(0);

startRotation();
