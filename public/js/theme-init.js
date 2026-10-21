try {
  document.documentElement.dataset.theme = localStorage.getItem('bcity_tema') || 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
