console.log("✅ Script loaded");
document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const darkModeKey = 'dark-mode-enabled';

    function enableDarkMode() {
      document.body.classList.add('dark-mode');
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
      localStorage.setItem(darkModeKey, 'true');
    }

    function disableDarkMode() {
      document.body.classList.remove('dark-mode');
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
      localStorage.setItem(darkModeKey, 'false');
    }

    function loadTheme() {
      const darkEnabled = localStorage.getItem(darkModeKey) === 'true';
      if (darkEnabled) enableDarkMode();
      else disableDarkMode();
    }

    toggleBtn.addEventListener('click', function () {
      if (document.body.classList.contains('dark-mode')) disableDarkMode();
      else enableDarkMode();
    });

    loadTheme();
  });