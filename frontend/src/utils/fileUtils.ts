import api from '../api';

/**
 * Fetches a protected file from the Citadel's archives and opens it in a new tab.
 */
export const openProtectedFile = async (filePath: string) => {
  try {
    // Remove leading slash to match the api instance's path handling
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    const response = await api.get(relativePath, {
      responseType: 'blob', // Important for handling PDF files
    });

    // Create a local URL for the PDF blob
    const file = new Blob([response.data], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);
    
    // Open the scroll in a new tab
    window.open(fileURL, '_blank');
    
  } catch (error: any) {
    console.error("The Maesters have blocked access:", error);
    if (error.response?.status === 401) {
      alert("A man is not authorized to see these archives. Please log in first! 🛡️");
    } else {
      alert("The archive could not be retrieved from the Citadel. 🏰");
    }
  }
};