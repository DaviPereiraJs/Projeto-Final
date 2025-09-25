document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle-button');

    // Aplica o tema salvo
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleButton.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggleButton.textContent = '🌙';
    }

    // Alterna tema ao clicar
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggleButton.textContent = isDarkMode ? '☀️' : '🌙';
    });
});
