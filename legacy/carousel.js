document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const nextButton = document.querySelector('.carousel-next');
    const prevButton = document.querySelector('.carousel-prev');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;

    const updateSlidePosition = () => {
        const width = slides[0].getBoundingClientRect().width;
        track.style.transform = 'translateX(-' + (width * currentIndex) + 'px)';
    };

    nextButton.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlidePosition();
    });

    prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlidePosition();
    });

    // Ajusta posição ao redimensionar a tela
    window.addEventListener('resize', updateSlidePosition);
});