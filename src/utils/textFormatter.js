/**
 * Formats bot response text with proper line breaks and structure
 * Handles numbered lists, paragraphs, and key phrases
 */
export function formatBotResponse(text) {
  if (!text) return [];

  // Split by numbered list patterns: "1. ", "2. ", etc.
  const parts = text.split(/(?=\d+\.\s)/);
  
  const formatted = [];
  
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Check if it's a numbered list item
    const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)$/s);
    
    if (numberedMatch) {
      formatted.push({
        type: 'list-item',
        number: numberedMatch[1],
        content: numberedMatch[2].trim()
      });
    } else {
      // Regular paragraph - split by sentences for better readability
      const sentences = trimmed.split(/\.\s+/).filter(s => s.trim());
      
      sentences.forEach((sentence, sIdx) => {
        const text = sentence.trim() + (sIdx < sentences.length - 1 ? '.' : '');
        
        // Detect if it contains keywords for special formatting
        const isKeyInsight = /key insights?|main|primary|important|note|however|additionally/i.test(text);
        
        formatted.push({
          type: 'paragraph',
          content: text,
          emphasis: isKeyInsight
        });
      });
    }
  });
  
  return formatted;
}

/**
 * Simple inline formatting for bold text
 */
export function parseInlineFormatting(text) {
  // Convert "text in quotes" to emphasized text
  return text.replace(/"([^"]+)"/g, '<span class="font-semibold text-slate-800">$1</span>');
}
