document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const jsonInput = document.getElementById('jsonInput');
    const jsonExplorer = document.getElementById('jsonExplorer');
    const jsonPath = document.getElementById('jsonPath');
    const formatBtn = document.getElementById('formatBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyPathBtn = document.getElementById('copyPathBtn');
    const pathFormat = document.getElementById('pathFormat');
    const errorMessage = document.getElementById('errorMessage');
    const validIndicator = document.getElementById('validIndicator');
    const invalidIndicator = document.getElementById('invalidIndicator');
    const suggestion = document.getElementById('suggestion');
    
    let currentJson = null;
    let selectedPath = [];
    
    // Initialize
    loadSavedJson();
    
    // Event Listeners
    jsonInput.addEventListener('input', debounce(parseJson, 500));
    formatBtn.addEventListener('click', formatJson);
    clearBtn.addEventListener('click', clearAll);
    copyPathBtn.addEventListener('click', copyPathToClipboard);
    pathFormat.addEventListener('change', updatePathDisplay);
    
    // Parse JSON from input
    function parseJson() {
      const input = jsonInput.value.trim();
      errorMessage.textContent = '';
      suggestion.textContent = '';
      jsonExplorer.innerHTML = '';
      
      // Reset all status indicators
      validIndicator.classList.add('hidden');
      invalidIndicator.classList.add('hidden');
      
      if (!input) {
        currentJson = null;
        selectedPath = [];
        updatePathDisplay();
        return;
      }
      
      try {
        currentJson = JSON.parse(input);
        
        // Show valid indicator
        validIndicator.classList.remove('hidden');
        
        saveJson(input);
        renderJsonExplorer(currentJson);
        selectedPath = [];
        updatePathDisplay();
      } catch (error) {
        // Show invalid indicator
        invalidIndicator.classList.remove('hidden');
        
        // Provide specific error information
        handleJsonError(input, error);
      }
    }
    
    // Handle JSON parsing errors with more helpful feedback
    function handleJsonError(input, error) {
      let errorMsg = 'Invalid JSON';
      let suggestionMsg = '';
      
      // Extract position information from error message if available
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch && posMatch[1]) {
        const position = parseInt(posMatch[1]);
        
        // Get context around the error
        const start = Math.max(0, position - 10);
        const end = Math.min(input.length, position + 10);
        let context = input.substring(start, end);
        
        // Highlight the error position
        if (position >= start && position < end) {
          const relativePos = position - start;
          context = context.substring(0, relativePos) + '→' + context.substring(relativePos);
        }
        
        // Check for common errors and provide suggestions
        if (error.message.includes('Unexpected end of JSON input')) {
          errorMsg = 'Unexpected end of JSON input';
          suggestionMsg = 'Check for missing closing brackets } or ] at the end of your JSON';
        } else if (error.message.includes('Unexpected token :')) {
          errorMsg = `Unexpected token : near: ${context}`;
          suggestionMsg = 'Make sure each property has a name wrapped in double quotes';
        } else if (error.message.includes('Unexpected token }')) {
          errorMsg = `Unexpected token } near: ${context}`;
          suggestionMsg = 'Check for trailing commas or missing properties';
        } else if (error.message.includes('Unexpected token ,')) {
          errorMsg = `Unexpected token , near: ${context}`;
          suggestionMsg = 'Check for empty items or trailing commas';
        } else if (error.message.includes('Unexpected token')) {
          const token = error.message.match(/Unexpected token (.*)/);
          if (token && token[1]) {
            errorMsg = `Unexpected token ${token[1]} near: ${context}`;
            suggestionMsg = 'Check syntax around this position';
          } else {
            errorMsg = `Syntax error near: ${context}`;
          }
        } else if (error.message.includes('Unexpected string')) {
          errorMsg = `Unexpected string near: ${context}`;
          suggestionMsg = 'Check for missing commas between properties or values';
        } else if (error.message.includes('Unexpected number')) {
          errorMsg = `Unexpected number near: ${context}`;
          suggestionMsg = 'Numbers should be part of a property value or array';
        } else if (error.message.includes('Unexpected character')) {
          errorMsg = `Unexpected character near: ${context}`;
          suggestionMsg = 'Check for invalid characters or formatting issues';
        } else {
          errorMsg = `${error.message} near: ${context}`;
        }
      } else {
        // Fallback for errors without position information
        errorMsg = error.message;
      }
      
      // Set error message and suggestion
      errorMessage.textContent = errorMsg;
      suggestion.textContent = suggestionMsg;
    }
    
    // Render JSON Explorer
    function renderJsonExplorer(data) {
      jsonExplorer.innerHTML = '';
      jsonExplorer.appendChild(createJsonTreeView(data, []));
    }
    
    // Create JSON Tree View
    function createJsonTreeView(data, path) {
      const container = document.createElement('div');
      
      if (data === null) {
        const item = createJsonItem('null', path);
        container.appendChild(item);
        return container;
      }
      
      if (typeof data !== 'object') {
        const item = createJsonItem(data, path);
        container.appendChild(item);
        return container;
      }
      
      const isArray = Array.isArray(data);
      const keys = Object.keys(data);
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = data[key];
        const newPath = [...path, key];
        const isExpandable = typeof value === 'object' && value !== null;
        
        const item = document.createElement('div');
        item.className = 'json-item' + (isExpandable ? ' collapsible' : '');
        
        const itemContent = document.createElement('div');
        itemContent.className = 'json-item-content';
        
        // Add path data attribute for easier selection
        itemContent.setAttribute('data-path', newPath.join(','));
        
        itemContent.addEventListener('click', function(e) {
          e.stopPropagation();
          selectJsonPath(newPath);
        });
        
        let displayContent = '';
        if (isArray) {
          displayContent += `<span class="json-key">[${key}]</span>: `;
        } else {
          displayContent += `<span class="json-key">"${key}"</span>: `;
        }
        
        if (isExpandable) {
          const type = isArray ? (Array.isArray(value) ? '[]' : '{}') : '{}';
          const length = Object.keys(value).length;
          displayContent += `<span class="json-bracket">${type}</span> <span class="json-length">(${length})</span>`;
          
          // Toggle expand/collapse
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('expanded');
            const children = this.querySelector('.json-children');
            if (children) {
              children.classList.toggle('hidden');
            }
          });
          
          const children = document.createElement('div');
          children.className = 'json-children hidden';
          children.appendChild(createJsonTreeView(value, newPath));
          item.appendChild(children);
        } else {
          displayContent += formatJsonValue(value);
        }
        
        itemContent.innerHTML = displayContent;
        item.appendChild(itemContent);
        container.appendChild(item);
      }
      
      return container;
    }
    
    // Create JSON Item
    function createJsonItem(value, path) {
      const item = document.createElement('div');
      item.className = 'json-item';
      
      const itemContent = document.createElement('div');
      itemContent.className = 'json-item-content';
      itemContent.setAttribute('data-path', path.join(','));
      
      itemContent.addEventListener('click', function(e) {
        e.stopPropagation();
        selectJsonPath(path);
      });
      
      itemContent.innerHTML = formatJsonValue(value);
      item.appendChild(itemContent);
      
      return item;
    }
    
    // Format JSON Value for display
    function formatJsonValue(value) {
      if (value === null) {
        return '<span class="json-null">null</span>';
      }
      
      switch (typeof value) {
        case 'string':
          return `<span class="json-string">"${escapeHtml(value)}"</span>`;
        case 'number':
          return `<span class="json-number">${value}</span>`;
        case 'boolean':
          return `<span class="json-boolean">${value}</span>`;
        default:
          return String(value);
      }
    }
    
    // Select JSON Path
    function selectJsonPath(path) {
      // Deselect previous selection
      const prevSelected = jsonExplorer.querySelector('.json-item-content.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }
      
      // Select new path
      const selector = `.json-item-content[data-path="${path.join(',')}"]`;
      const element = jsonExplorer.querySelector(selector);
      if (element) {
        element.classList.add('selected');
      }
      
      selectedPath = path;
      updatePathDisplay();
    }
    
    // Update Path Display
    function updatePathDisplay() {
      if (selectedPath.length === 0) {
        jsonPath.textContent = '';
        return;
      }
      
      const format = pathFormat.value;
      let pathString = '';
      
      if (format === 'dot') {
        pathString = selectedPath.reduce((acc, key, index) => {
          const isArrayIndex = !isNaN(key);
          if (index === 0) {
            return isArrayIndex ? `[${key}]` : key;
          } else {
            return isArrayIndex ? `${acc}[${key}]` : `${acc}.${key}`;
          }
        }, '');
      } else if (format === 'bracket') {
        pathString = selectedPath.reduce((acc, key, index) => {
          if (index === 0) {
            return `['${key}']`;
          } else {
            return `${acc}['${key}']`;
          }
        }, '');
      }
      
      jsonPath.textContent = pathString;
    }
    
    // Format JSON
    function formatJson() {
      if (!jsonInput.value.trim()) return;
      
      try {
        const obj = JSON.parse(jsonInput.value);
        jsonInput.value = JSON.stringify(obj, null, 2);
        parseJson();
      } catch (error) {
        errorMessage.textContent = `Invalid JSON: ${error.message}`;
      }
    }
    
    // Clear All
    function clearAll() {
      jsonInput.value = '';
      jsonExplorer.innerHTML = '';
      jsonPath.textContent = '';
      errorMessage.textContent = '';
      suggestion.textContent = '';
      validIndicator.classList.add('hidden');
      invalidIndicator.classList.add('hidden');
      selectedPath = [];
      currentJson = null;
      chrome.storage.local.remove('savedJson');
    }
    
    // Copy Path to Clipboard
    function copyPathToClipboard() {
      const path = jsonPath.textContent;
      if (!path) return;
      
      navigator.clipboard.writeText(path)
        .then(() => {
          // Visual feedback
          const originalText = copyPathBtn.textContent;
          copyPathBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyPathBtn.textContent = originalText;
          }, 1000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
    
    // Save JSON to storage
    function saveJson(jsonStr) {
      chrome.storage.local.set({ 'savedJson': jsonStr });
    }
    
    // Load saved JSON from storage
    function loadSavedJson() {
      chrome.storage.local.get('savedJson', function(result) {
        if (result.savedJson) {
          jsonInput.value = result.savedJson;
          parseJson();
        }
      });
    }
    
    // Helper functions
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    function debounce(func, wait) {
      let timeout;
      return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    }
  });