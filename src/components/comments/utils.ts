/**
 * Check if a URL or filename represents an image file
 */
export function isImageUrl(urlOrName: string): boolean {
  if (!urlOrName) return false;
  
  const lowerCase = urlOrName.toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  
  // Check extension
  if (imageExtensions.some(ext => lowerCase.endsWith(ext))) {
    return true;
  }
  
  // Check for common image MIME type patterns in URLs
  if (lowerCase.includes('image/') || lowerCase.includes('/images/')) {
    return true;
  }
  
  return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
