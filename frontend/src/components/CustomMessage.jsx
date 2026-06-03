// import React, { useState } from 'react';
// import axios from 'axios';

// /**
//  * 🌐 INLINE AI TRANSLATION WRAPPER COMPONENT
//  */
// export const CustomMessageTextWithTranslation = ({ message }) => {
//   const [translatedText, setTranslatedText] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // Guardrail: If message has no text (like an attachment-only image), render nothing safely
//   if (!message?.text) return null;

//   // Trigger backend translation endpoint
//   const handleTranslateClick = async (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (loading || translatedText) return;
    
//     setLoading(true);
//     try {
//       const response = await axios.post('http://localhost:3000/api/ai/translate', {
//         text: message.text,
//         targetLanguage: "English" 
//       });

//       if (response.data?.success) {
//         setTranslatedText(response.data.translatedText);
//       }
//     } catch (error) {
//       console.error("AI Frontend interface error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="w-full block clear-both mt-1 select-none">
//       {!translatedText ? (
//         <button
//           onClick={handleTranslateClick}
//           disabled={loading}
//           className="text-[10px] font-bold tracking-wider uppercase text-blue-600 hover:text-blue-800 transition-all cursor-pointer focus:outline-none border-none bg-transparent p-0 flex items-center gap-1 mt-0.5"
//         >
//           <span>🌐</span> 
//           {loading ? "Translating..." : "Translate to English"}
//         </button>
//       ) : (
//         <div className="mt-1.5 p-2 bg-blue-50 text-blue-950 border border-blue-100 rounded-md text-xs font-normal text-left max-w-[85%] shadow-xs animate-fade-in">
//           <span className="text-[9px] font-black tracking-widest uppercase text-blue-500 block mb-0.5">
//             ✨ hiii AI Translation
//           </span>
//           {translatedText}
//         </div>
//       )}
//     </div>
//   );
// };