<script setup>
defineEmits(['close']);
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <header>
        <h2>How to Add Sources</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </header>

      <div class="section">
        <h3>1. Standard Websites (RSS)</h3>
        <p>Most news sites and blogs have an RSS feed, even if they hide it.</p>
        <ul>
          <li><strong>Look for the Icon:</strong> <span class="rss-icon">📡</span> or the word "Subscribe".</li>
          <li><strong>Try the URL trick:</strong> Add <code>/feed</code> to the end of a homepage (e.g., <code>techcrunch.com/feed</code>).</li>
          <li><strong>Substacks:</strong> Usually <code>name.substack.com/feed</code>.</li>
        </ul>
      </div>

      <div class="section official">
        <h3>2. Federal Register (Action Tracking)</h3>
        <p>Track public comment opportunities for specific agencies.</p>
        <ol>
          <li>Go to <a href="https://www.federalregister.gov/documents/search" target="_blank">FederalRegister.gov Search</a>.</li>
          <li><strong>Filter:</strong> Select your Agency (e.g., EPA) and search for keywords (e.g., "Carbon").</li>
          <li><strong>Copy the URL:</strong> Copy the web address from your browser bar.</li>
          <li><strong>Paste it here:</strong> We will automatically find the deadlines for you.</li>
        </ol>
      </div>

      <footer>
        <button class="done-btn" @click="$emit('close')">Got it</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  
  /* CRITICAL FIX: Override the global 'text-align: center' from style.css */
  text-align: left; 
  line-height: 1.6;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

h2 { margin: 0; font-size: 1.2rem; color: #111; }

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #888;
  line-height: 1;
}
.close-btn:hover { color: #333; }

.section { margin-bottom: 20px; }
.section h3 { font-size: 1rem; color: #333; margin-bottom: 8px; font-weight: 700; }

/* Clean List Styling */
.section ul, .section ol { 
  padding-left: 25px; /* Standard indentation */
  margin: 0 0 10px 0;
}

.section li { 
  margin-bottom: 8px; 
  color: #555;
  font-size: 0.95rem;
}

/* Official Section (Blue Box) */
.official {
  background: #f0f9ff;
  padding: 15px 20px;
  border-radius: 6px;
  border-left: 4px solid #003366;
  margin-top: 20px;
}

.official h3 { color: #003366; margin-top: 0; }
.official a { color: #0066cc; text-decoration: underline; font-weight: 600; }

.done-btn {
  width: 100%;
  padding: 12px;
  background: #333;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  margin-top: 10px;
}
.done-btn:hover { background: #555; }
</style>